import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { SendMessageInput, StartThreadInput } from "@skolara/types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Who a parent may message about a child: the teachers assigned to the
   * child's class. Nobody else — not another school's staff, not other
   * parents, not a teacher who has never taught the child.
   */
  async contactsFor(schoolId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    if (!student?.classId) return [];
    const rows = await this.prisma.classTeacher.findMany({
      where: { classId: student.classId, teacherUser: { isActive: true, schoolId } },
      select: { teacherUser: { select: { id: true, firstName: true, lastName: true } } },
    });
    return rows.map((row) => row.teacherUser);
  }

  // Parents initiate contact by picking their child and one of the child's
  // teachers; teachers reply within the thread rather than starting new ones.
  async startThread(schoolId: string, parentUserId: string, input: StartThreadInput) {
    const contacts = await this.contactsFor(schoolId, input.studentId);
    if (!contacts.some((teacher) => teacher.id === input.teacherUserId)) {
      throw new ForbiddenException("You can only message your child's teachers");
    }
    return this.prisma.messageThread.upsert({
      where: {
        studentId_teacherUserId_parentUserId: {
          studentId: input.studentId,
          teacherUserId: input.teacherUserId,
          parentUserId,
        },
      },
      create: {
        schoolId,
        studentId: input.studentId,
        teacherUserId: input.teacherUserId,
        parentUserId,
      },
      update: {},
    });
  }

  /** Conversations with the other person's name and the latest message, busiest first. */
  async findThreadsFor(userId: string) {
    const person = { select: { id: true, firstName: true, lastName: true } } as const;
    const threads = await this.prisma.messageThread.findMany({
      where: { OR: [{ teacherUserId: userId }, { parentUserId: userId }] },
      include: {
        student: {
          select: {
            id: true,
            user: person,
            class: { select: { name: true, section: true } },
          },
        },
        teacherUser: person,
        parentUser: person,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return threads
      .map(({ messages, ...thread }) => ({ ...thread, lastMessage: messages[0] ?? null }))
      .sort(
        (a, b) =>
          +(b.lastMessage?.createdAt ?? b.createdAt) - +(a.lastMessage?.createdAt ?? a.createdAt),
      );
  }

  private async assertParticipant(userId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException("Thread not found");
    if (thread.teacherUserId !== userId && thread.parentUserId !== userId) {
      throw new ForbiddenException("Not a participant in this thread");
    }
    return thread;
  }

  async findMessages(userId: string, threadId: string) {
    await this.assertParticipant(userId, threadId);
    return this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
  }

  async sendMessage(userId: string, threadId: string, input: SendMessageInput) {
    const thread = await this.assertParticipant(userId, threadId);
    const message = await this.prisma.message.create({
      data: { threadId, senderId: userId, body: input.body },
    });

    const recipientId =
      thread.teacherUserId === userId ? thread.parentUserId : thread.teacherUserId;
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await this.notifications.sendPush([recipientId], {
      title: sender ? `${sender.firstName} ${sender.lastName}` : "New message",
      body: input.body,
      data: { type: "MESSAGE", threadId },
    });

    return message;
  }
}
