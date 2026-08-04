import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateClassInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateClassInput) {
    return this.prisma.schoolClass.create({ data: input });
  }

  findAllForSchool(schoolId: string) {
    return this.prisma.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    });
  }

  async findOne(schoolId: string, id: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id, schoolId },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");
    return schoolClass;
  }
}
