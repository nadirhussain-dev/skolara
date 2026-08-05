import { Injectable, NotFoundException } from "@nestjs/common";
import type { AssignSchoolToGroupInput, CreateSchoolGroupInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchoolGroupsService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateSchoolGroupInput) {
    return this.prisma.schoolGroup.create({ data: { name: input.name } });
  }

  findAll() {
    return this.prisma.schoolGroup.findMany({ orderBy: { createdAt: "desc" } });
  }

  async assignSchool(groupId: string, input: AssignSchoolToGroupInput) {
    const group = await this.prisma.schoolGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("School group not found");

    return this.prisma.school.update({
      where: { id: input.schoolId },
      data: { schoolGroupId: groupId },
    });
  }

  findSchools(groupId: string) {
    return this.prisma.school.findMany({ where: { schoolGroupId: groupId } });
  }
}
