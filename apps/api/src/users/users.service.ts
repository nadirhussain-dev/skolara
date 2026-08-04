import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { RoleType } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateSchoolUserInput {
  schoolId: string;
  role: RoleType;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createSchoolUser(input: CreateSchoolUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        schoolId: input.schoolId,
        role: input.role,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    });
  }

  findAllBySchool(schoolId: string, role?: RoleType) {
    return this.prisma.user.findMany({
      where: { schoolId, ...(role ? { role } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }
}
