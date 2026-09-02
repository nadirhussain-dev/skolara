import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";

const SCHOOL = "school-1";
const TEACHER = "teacher-1";
const PARENT = "parent-1";
const STUDENT = "student-1";
const SLOT = "slot-1";

const future = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
const past = () => new Date(Date.now() - 7 * 24 * 3600 * 1000);

describe("MeetingsService", () => {
  let prisma: {
    meetingSlot: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    parentStudentLink: { findUnique: jest.Mock };
  };
  let notifications: { sendPush: jest.Mock };
  let service: MeetingsService;

  beforeEach(() => {
    prisma = {
      meetingSlot: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: SLOT,
          teacherUserId: TEACHER,
          startsAt: future(),
          bookedByParentUser: { firstName: "Imran" },
          student: { user: { firstName: "Ayesha" } },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn(),
      },
      parentStudentLink: { findUnique: jest.fn().mockResolvedValue({ parentUserId: PARENT }) },
    };
    notifications = { sendPush: jest.fn() };
    service = new MeetingsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("publish", () => {
    it("publishes a batch and reports how many landed", async () => {
      const slots = [
        { startsAt: future(), endsAt: future() },
        { startsAt: future(), endsAt: future() },
        { startsAt: future(), endsAt: future() },
      ];
      const result = await service.publish(SCHOOL, TEACHER, { slots });

      expect(result).toEqual({ published: 3, requested: 3 });
      // Republishing an evening after adding one slot mustn't fail the batch.
      expect(prisma.meetingSlot.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it("reports duplicates skipped rather than pretending everything published", async () => {
      prisma.meetingSlot.createMany.mockResolvedValue({ count: 1 });
      const result = await service.publish(SCHOOL, TEACHER, {
        slots: [
          { startsAt: future(), endsAt: future() },
          { startsAt: future(), endsAt: future() },
        ],
      });
      expect(result).toEqual({ published: 1, requested: 2 });
    });

    it("refuses to publish a slot in the past", async () => {
      await expect(
        service.publish(SCHOOL, TEACHER, { slots: [{ startsAt: past(), endsAt: past() }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.meetingSlot.createMany).not.toHaveBeenCalled();
    });
  });

  describe("book", () => {
    it("claims the slot and tells the teacher", async () => {
      await service.book(SCHOOL, SLOT, PARENT, { studentId: STUDENT });

      expect(notifications.sendPush).toHaveBeenCalledWith(
        [TEACHER],
        expect.objectContaining({ title: "Meeting booked" }),
      );
    });

    it("claims the slot with a conditional update, so two parents can't both win", async () => {
      await service.book(SCHOOL, SLOT, PARENT, { studentId: STUDENT });

      expect(prisma.meetingSlot.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bookedByParentUserId: null }),
        }),
      );
    });

    it("reports a conflict when someone else booked it first", async () => {
      prisma.meetingSlot.updateMany.mockResolvedValue({ count: 0 });
      prisma.meetingSlot.findFirst.mockResolvedValue({
        bookedByParentUserId: "parent-2",
        startsAt: future(),
      });

      await expect(
        service.book(SCHOOL, SLOT, PARENT, { studentId: STUDENT }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("distinguishes a vanished slot from a taken one", async () => {
      prisma.meetingSlot.updateMany.mockResolvedValue({ count: 0 });
      prisma.meetingSlot.findFirst.mockResolvedValue(null);

      await expect(
        service.book(SCHOOL, SLOT, PARENT, { studentId: STUDENT }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("distinguishes a past slot from a taken one", async () => {
      prisma.meetingSlot.updateMany.mockResolvedValue({ count: 0 });
      prisma.meetingSlot.findFirst.mockResolvedValue({
        bookedByParentUserId: null,
        startsAt: past(),
      });

      await expect(
        service.book(SCHOOL, SLOT, PARENT, { studentId: STUDENT }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to book on behalf of a child who isn't theirs", async () => {
      prisma.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        service.book(SCHOOL, SLOT, PARENT, { studentId: "someone-elses-child" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.meetingSlot.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("cancelBooking", () => {
    it("releases the slot back on offer", async () => {
      await service.cancelBooking(SCHOOL, SLOT, PARENT);
      expect(prisma.meetingSlot.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookedByParentUserId: null, studentId: null }),
        }),
      );
    });

    it("won't let a parent release someone else's booking", async () => {
      prisma.meetingSlot.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.cancelBooking(SCHOOL, SLOT, PARENT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("withdraw", () => {
    it("removes a slot nobody has taken", async () => {
      prisma.meetingSlot.findFirst.mockResolvedValue({ bookedByParentUserId: null });
      await service.withdraw(SCHOOL, SLOT, TEACHER);
      expect(prisma.meetingSlot.delete).toHaveBeenCalledWith({ where: { id: SLOT } });
    });

    it("refuses to silently cancel a booked meeting", async () => {
      prisma.meetingSlot.findFirst.mockResolvedValue({ bookedByParentUserId: PARENT });
      await expect(service.withdraw(SCHOOL, SLOT, TEACHER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.meetingSlot.delete).not.toHaveBeenCalled();
    });

    it("won't let a teacher withdraw another teacher's slot", async () => {
      prisma.meetingSlot.findFirst.mockResolvedValue(null);
      await expect(service.withdraw(SCHOOL, SLOT, TEACHER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
