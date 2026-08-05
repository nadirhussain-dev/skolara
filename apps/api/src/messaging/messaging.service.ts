import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { SendMessageInput, StartThreadInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  // Parents initiate contact by picking their child and a teacher; teachers
  // reply within the thread rather than starting new ones.
  async startThread(schoolId: string, parentUserId: string, input: StartThreadInput) {
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

  findThreadsFor(userId: string) {
    return this.prisma.messageThread.findMany({
      where: { OR: [{ teacherUserId: userId }, { parentUserId: userId }] },
      include: {
        student: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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
    await this.assertParticipant(userId, threadId);
    return this.prisma.message.create({
      data: { threadId, senderId: userId, body: input.body },
    });
  }
}
