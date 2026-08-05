import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { CreateTeacherInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateTeacherInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          schoolId: input.schoolId,
          role: "TEACHER",
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
        },
      });

      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId: input.schoolId,
          employeeNumber: input.employeeNumber,
          subjects: input.subjects,
        },
      });
    });
  }

  findAllForSchool(schoolId: string) {
    return this.prisma.teacherProfile.findMany({
      where: { schoolId },
      include: { user: { select: PUBLIC_USER_SELECT } },
    });
  }

  async findOne(schoolId: string, id: string) {
    const profile = await this.prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      include: { user: { select: PUBLIC_USER_SELECT } },
    });
    if (!profile) throw new NotFoundException("Teacher not found");
    return profile;
  }
}
