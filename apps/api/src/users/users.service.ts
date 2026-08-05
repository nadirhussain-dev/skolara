import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { CreateUserInput, RoleType } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_USER_SELECT = {
  id: true,
  schoolId: true,
  role: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createSchoolUser(input: CreateUserInput) {
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
      select: PUBLIC_USER_SELECT,
    });
  }

  findAllBySchool(schoolId: string, role?: RoleType) {
    return this.prisma.user.findMany({
      where: { schoolId, ...(role ? { role } : {}) },
      orderBy: { createdAt: "desc" },
      select: PUBLIC_USER_SELECT,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: PUBLIC_USER_SELECT,
    });
  }
}
