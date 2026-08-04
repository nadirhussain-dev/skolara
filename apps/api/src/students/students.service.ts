import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { AdmitStudentInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async admit(input: AdmitStudentInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId: input.schoolId,
          role: "STUDENT",
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          schoolId: input.schoolId,
          classId: input.classId,
          admissionNumber: input.admissionNumber,
          dateOfBirth: input.dateOfBirth,
        },
      });

      if (input.parentUserIds.length > 0) {
        await tx.parentStudentLink.createMany({
          data: input.parentUserIds.map((parentUserId) => ({
            parentUserId,
            studentId: profile.id,
          })),
        });
      }

      return profile;
    });
  }

  findChildrenForParent(parentUserId: string) {
    return this.prisma.studentProfile.findMany({
      where: { parentLinks: { some: { parentUserId } } },
      include: { user: true },
    });
  }

  findAllForClass(schoolId: string, classId: string) {
    return this.prisma.studentProfile.findMany({
      where: { schoolId, classId },
      include: { user: true },
    });
  }

  async findOne(schoolId: string, id: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id, schoolId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException("Student not found");
    return profile;
  }

  async assignClass(schoolId: string, id: string, classId: string) {
    await this.findOne(schoolId, id);
    return this.prisma.studentProfile.update({
      where: { id },
      data: { classId },
    });
  }
}
