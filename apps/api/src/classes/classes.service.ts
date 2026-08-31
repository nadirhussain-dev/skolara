import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateClassInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateClassInput) {
    return this.prisma.schoolClass.create({ data: input });
  }

  /**
   * `teacherUserId` scopes the list to the classes that teacher is assigned
   * to. Omit it for a school admin, who sees every class.
   */
  findAllForSchool(schoolId: string, teacherUserId?: string) {
    return this.prisma.schoolClass.findMany({
      where: {
        schoolId,
        ...(teacherUserId ? { classTeachers: { some: { teacherUserId } } } : {}),
      },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    });
  }

  async findTeachers(schoolId: string, classId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
      include: {
        classTeachers: {
          include: {
            teacherUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");
    return schoolClass.classTeachers.map((assignment) => assignment.teacherUser);
  }

  async assignTeacher(schoolId: string, classId: string, teacherUserId: string) {
    const [schoolClass, teacher] = await Promise.all([
      this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId } }),
      this.prisma.user.findFirst({
        where: { id: teacherUserId, schoolId, role: "TEACHER" },
      }),
    ]);
    if (!schoolClass) throw new NotFoundException("Class not found");
    // Scoped to the same school, so this can't assign a teacher across tenants.
    if (!teacher) throw new NotFoundException("Teacher not found in this school");

    // Idempotent — re-assigning shouldn't be an error the UI has to handle.
    await this.prisma.classTeacher.upsert({
      where: { classId_teacherUserId: { classId, teacherUserId } },
      create: { classId, teacherUserId },
      update: {},
    });

    return this.findTeachers(schoolId, classId);
  }

  async unassignTeacher(schoolId: string, classId: string, teacherUserId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");

    await this.prisma.classTeacher.deleteMany({ where: { classId, teacherUserId } });
    return this.findTeachers(schoolId, classId);
  }

  async findOne(schoolId: string, id: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id, schoolId },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");
    return schoolClass;
  }
}
