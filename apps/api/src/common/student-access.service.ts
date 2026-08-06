import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentAccessService {
  constructor(private prisma: PrismaService) {}

  async assertCanAccessStudent(user: AuthenticatedUser, studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { schoolId: true, userId: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    if (user.role === "SCHOOL_ADMIN" || user.role === "TEACHER") {
      if (student.schoolId !== user.schoolId) {
        throw new ForbiddenException("Not allowed to view this record");
      }
      return;
    }

    if (user.role === "STUDENT") {
      if (student.userId !== user.id) throw new ForbiddenException("Not your record");
      return;
    }

    if (user.role === "PARENT") {
      const link = await this.prisma.parentStudentLink.findUnique({
        where: { parentUserId_studentId: { parentUserId: user.id, studentId } },
      });
      if (!link) throw new ForbiddenException("Not your child's record");
      return;
    }

    throw new ForbiddenException("Not allowed to view this record");
  }
}
