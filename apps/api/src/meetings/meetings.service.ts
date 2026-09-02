import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  BookMeetingSlotInput,
  PublishMeetingSlotsInput,
} from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const SLOT_INCLUDE = {
  teacherUser: { select: { id: true, firstName: true, lastName: true } },
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  bookedByParentUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
} as const;

@Injectable()
export class MeetingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Publishes a batch of slots, skipping any the teacher already offers at the
   * same instant. `skipDuplicates` rather than failing the batch: republishing
   * an evening after adding one more slot shouldn't be an error.
   */
  async publish(
    schoolId: string,
    teacherUserId: string,
    input: PublishMeetingSlotsInput,
  ) {
    const now = new Date();
    if (input.slots.some((slot) => slot.startsAt < now)) {
      throw new BadRequestException("Slots can't be published in the past");
    }

    const result = await this.prisma.meetingSlot.createMany({
      data: input.slots.map((slot) => ({
        schoolId,
        teacherUserId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      })),
      skipDuplicates: true,
    });

    return { published: result.count, requested: input.slots.length };
  }

  /** A teacher's own slots, booked and free, so they can see their evening. */
  mine(schoolId: string, teacherUserId: string) {
    return this.prisma.meetingSlot.findMany({
      where: { schoolId, teacherUserId },
      orderBy: { startsAt: "asc" },
      include: SLOT_INCLUDE,
    });
  }

  /**
   * Slots a parent can still book. Past slots are excluded — an empty list
   * reads better than a list of appointments that already happened.
   */
  available(schoolId: string, teacherUserId?: string) {
    return this.prisma.meetingSlot.findMany({
      where: {
        schoolId,
        bookedByParentUserId: null,
        startsAt: { gte: new Date() },
        ...(teacherUserId ? { teacherUserId } : {}),
      },
      orderBy: { startsAt: "asc" },
      include: SLOT_INCLUDE,
    });
  }

  /** What this parent has booked, so they can see and cancel their own. */
  bookedByParent(schoolId: string, parentUserId: string) {
    return this.prisma.meetingSlot.findMany({
      where: { schoolId, bookedByParentUserId: parentUserId },
      orderBy: { startsAt: "asc" },
      include: SLOT_INCLUDE,
    });
  }

  async book(
    schoolId: string,
    slotId: string,
    parentUserId: string,
    input: BookMeetingSlotInput,
  ) {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: { parentUserId_studentId: { parentUserId, studentId: input.studentId } },
    });
    if (!link) throw new ForbiddenException("Not your child's record");

    // Conditional update rather than read-then-write: two parents tapping the
    // same slot at the same moment would both pass a prior existence check,
    // and the second would silently overwrite the first's booking. Filtering
    // on `bookedByParentUserId: null` inside the update makes the database
    // decide, and a count of zero means someone got there first.
    const claimed = await this.prisma.meetingSlot.updateMany({
      where: {
        id: slotId,
        schoolId,
        bookedByParentUserId: null,
        startsAt: { gte: new Date() },
      },
      data: {
        bookedByParentUserId: parentUserId,
        studentId: input.studentId,
        bookedAt: new Date(),
        note: input.note ?? null,
      },
    });

    if (claimed.count === 0) {
      // Distinguish "gone" from "never existed" so the parent knows whether
      // to pick another slot or check the link they followed.
      const slot = await this.prisma.meetingSlot.findFirst({
        where: { id: slotId, schoolId },
        select: { bookedByParentUserId: true, startsAt: true },
      });
      if (!slot) throw new NotFoundException("That slot no longer exists");
      if (slot.startsAt < new Date()) {
        throw new BadRequestException("That slot is in the past");
      }
      throw new ConflictException("Someone else just booked that slot");
    }

    const slot = await this.prisma.meetingSlot.findUniqueOrThrow({
      where: { id: slotId },
      include: SLOT_INCLUDE,
    });

    await this.notifications.sendPush([slot.teacherUserId], {
      title: "Meeting booked",
      body: `${slot.bookedByParentUser?.firstName ?? "A parent"} booked ${slot.startsAt.toLocaleString("en-GB")} to talk about ${slot.student?.user.firstName ?? "their child"}.`,
      data: { type: "MEETING", slotId },
    });

    return slot;
  }

  /** A parent releasing their booking; the slot goes back on offer. */
  async cancelBooking(schoolId: string, slotId: string, parentUserId: string) {
    const released = await this.prisma.meetingSlot.updateMany({
      where: { id: slotId, schoolId, bookedByParentUserId: parentUserId },
      data: {
        bookedByParentUserId: null,
        studentId: null,
        bookedAt: null,
        note: null,
      },
    });
    if (released.count === 0) {
      throw new NotFoundException("You don't have a booking for that slot");
    }
  }

  /** A teacher withdrawing a slot nobody has taken. */
  async withdraw(schoolId: string, slotId: string, teacherUserId: string) {
    const slot = await this.prisma.meetingSlot.findFirst({
      where: { id: slotId, schoolId, teacherUserId },
      select: { bookedByParentUserId: true },
    });
    if (!slot) throw new NotFoundException("Slot not found");
    if (slot.bookedByParentUserId) {
      // Silently cancelling a booked meeting would leave a parent turning up
      // to nothing. Make the teacher deal with the parent first.
      throw new BadRequestException(
        "That slot is booked — message the parent before withdrawing it",
      );
    }
    await this.prisma.meetingSlot.delete({ where: { id: slotId } });
  }
}
