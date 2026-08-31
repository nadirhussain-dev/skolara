import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClassAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Asserts the caller may act on this class — mark its register, enter its
   * grades, set its homework.
   *
   * School admins may act on any class in their own school. Teachers may only
   * act on classes they're assigned to: without this, any teacher could
   * overwrite a colleague's marks or take a register for a class they've never
   * met.
   */
  async assertCanTeachClass(user: AuthenticatedUser, classId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: user.schoolId ?? undefined },
      select: { id: true },
    });
    // Deliberately "not found" rather than "forbidden" for a class in another
    // school — confirming it exists would leak another tenant's data.
    if (!schoolClass) throw new NotFoundException("Class not found");

    if (user.role !== "TEACHER") return;

    const assignment = await this.prisma.classTeacher.findUnique({
      where: { classId_teacherUserId: { classId, teacherUserId: user.id } },
      select: { classId: true },
    });
    if (!assignment) {
      throw new ForbiddenException("You aren't assigned to this class");
    }
  }

  /** Class ids a teacher is assigned to, for scoping list endpoints. */
  async classIdsForTeacher(teacherUserId: string): Promise<string[]> {
    const rows = await this.prisma.classTeacher.findMany({
      where: { teacherUserId },
      select: { classId: true },
    });
    return rows.map((row) => row.classId);
  }
}
