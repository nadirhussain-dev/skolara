import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
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
  // Shown in the accounts list so an admin can see who is restricted. Not
  // sensitive: it names a template inside the same school and grants nothing.
  roleTemplateId: true,
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

  /**
   * Staff only, for the directory.
   *
   * A separate method rather than widening findAllBySchool: teachers need
   * colleagues' contact details, but the general user list also contains every
   * parent and student, and a role parameter a caller controls is one typo
   * away from handing a teacher the whole parent roster.
   */
  staffDirectory(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER"] } },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
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

  async findOne(schoolId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /**
   * Switches an account on or off. An admin cannot switch off their own
   * account: a school with one admin would be locked out with nobody able to
   * undo it. Switching an account off also revokes its sessions, so the
   * person is signed out when their current short-lived token runs out
   * rather than being able to renew it.
   */
  async setActive(schoolId: string, id: string, isActive: boolean, actorUserId?: string) {
    if (!isActive && actorUserId === id) {
      throw new BadRequestException("You cannot deactivate your own account");
    }
    await this.findOne(schoolId, id);
    if (!isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: PUBLIC_USER_SELECT,
    });
  }
}
