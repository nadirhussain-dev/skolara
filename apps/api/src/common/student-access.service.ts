import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentAccessService {
  constructor(private prisma: PrismaService) {}

  async assertCanAccessStudent(user: AuthenticatedUser, studentId: string) {
    if (user.role === "SCHOOL_ADMIN" || user.role === "TEACHER") return;

    if (user.role === "STUDENT") {
      const owned = await this.prisma.studentProfile.findFirst({
        where: { id: studentId, userId: user.id },
      });
      if (!owned) throw new ForbiddenException("Not your record");
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
