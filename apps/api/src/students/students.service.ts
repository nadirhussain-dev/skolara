import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { AdmitStudentInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

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
      include: { user: { select: PUBLIC_USER_SELECT } },
    });
  }

  findAllForClass(schoolId: string, classId: string) {
    return this.prisma.studentProfile.findMany({
      where: { schoolId, classId },
      include: { user: { select: PUBLIC_USER_SELECT } },
    });
  }

  async findOne(schoolId: string, id: string) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id, schoolId },
      include: { user: { select: PUBLIC_USER_SELECT } },
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

  /**
   * Links an existing parent account to a student after admission. Without
   * this, parents could only ever be attached at the moment a student was
   * created, so a second child — or a parent account created later — could
   * never be connected, and the app's multi-child switcher stayed empty.
   */
  async linkParent(schoolId: string, studentId: string, parentUserId: string) {
    const [student, parent] = await Promise.all([
      this.prisma.studentProfile.findFirst({ where: { id: studentId, schoolId } }),
      this.prisma.user.findFirst({
        where: { id: parentUserId, schoolId, role: "PARENT" },
      }),
    ]);
    if (!student) throw new NotFoundException("Student not found");
    // Checked against the same school, so this can't link a parent across tenants.
    if (!parent) throw new NotFoundException("Parent not found in this school");

    // Idempotent: re-linking an existing pair shouldn't be an error the UI
    // has to special-case.
    await this.prisma.parentStudentLink.upsert({
      where: { parentUserId_studentId: { parentUserId, studentId } },
      create: { parentUserId, studentId },
      update: {},
    });

    return this.findParents(schoolId, studentId);
  }

  async unlinkParent(schoolId: string, studentId: string, parentUserId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException("Student not found");

    await this.prisma.parentStudentLink.deleteMany({ where: { parentUserId, studentId } });
    return this.findParents(schoolId, studentId);
  }

  async findParents(schoolId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      include: { parentLinks: { include: { parentUser: { select: PUBLIC_USER_SELECT } } } },
    });
    if (!student) throw new NotFoundException("Student not found");
    return student.parentLinks.map((link) => link.parentUser);
  }
}
