import { ForbiddenException } from "@nestjs/common";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { MessagingService } from "./messaging.service";

// A parent could once open a conversation with any user id at all — another
// school's teacher, an admin, another parent. Contacts are now the teachers
// assigned to the child's class, and starting a thread is checked against them.

describe("MessagingService", () => {
  const prisma = {
    studentProfile: { findFirst: jest.fn() },
    classTeacher: { findMany: jest.fn() },
    messageThread: { upsert: jest.fn(), findMany: jest.fn() },
  };
  const service = new MessagingService(
    prisma as unknown as PrismaService,
    { sendPush: jest.fn() } as unknown as NotificationsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.studentProfile.findFirst.mockResolvedValue({ classId: "class-1" });
    prisma.classTeacher.findMany.mockResolvedValue([
      { teacherUser: { id: "teacher-1", firstName: "Asma", lastName: "Tariq" } },
    ]);
  });

  it("lists the child's class teachers as contacts, scoped to the school", async () => {
    await expect(service.contactsFor("school-1", "child-1")).resolves.toEqual([
      { id: "teacher-1", firstName: "Asma", lastName: "Tariq" },
    ]);
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: { id: "child-1", schoolId: "school-1" },
      select: { classId: true },
    });
  });

  it("has no contacts for a child without a class", async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({ classId: null });
    await expect(service.contactsFor("school-1", "child-1")).resolves.toEqual([]);
  });

  it("refuses a conversation with someone who doesn't teach the child", async () => {
    await expect(
      service.startThread("school-1", "parent-1", { studentId: "child-1", teacherUserId: "admin-9" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.messageThread.upsert).not.toHaveBeenCalled();
  });

  it("opens a conversation with one of the child's teachers", async () => {
    prisma.messageThread.upsert.mockResolvedValue({ id: "thread-1" });
    await expect(
      service.startThread("school-1", "parent-1", { studentId: "child-1", teacherUserId: "teacher-1" }),
    ).resolves.toEqual({ id: "thread-1" });
  });

  it("lists the busiest conversation first", async () => {
    prisma.messageThread.findMany.mockResolvedValue([
      { id: "quiet", createdAt: new Date("2026-10-01"), messages: [] },
      { id: "busy", createdAt: new Date("2026-09-01"), messages: [{ body: "hi", createdAt: new Date("2026-10-10") }] },
    ]);
    const threads = await service.findThreadsFor("teacher-1");
    expect(threads.map((t) => t.id)).toEqual(["busy", "quiet"]);
    expect(threads[0]!.lastMessage).toMatchObject({ body: "hi" });
  });
});
