import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { PublishStudyMaterialInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const MATERIAL_INCLUDE = {
  uploadedByUser: { select: { id: true, firstName: true, lastName: true } },
  class: { select: { id: true, name: true, section: true } },
} as const;

@Injectable()
export class StudyMaterialsService {
  constructor(private prisma: PrismaService) {}

  async publish(
    schoolId: string,
    uploadedByUserId: string,
    input: PublishStudyMaterialInput,
  ) {
    const schoolClass = await this.prisma.schoolClass.findFirst({
      where: { id: input.classId, schoolId },
      select: { id: true },
    });
    if (!schoolClass) throw new NotFoundException("Class not found");

    return this.prisma.studyMaterial.create({
      data: {
        schoolId,
        classId: input.classId,
        subject: input.subject,
        title: input.title,
        description: input.description ?? null,
        fileKey: input.fileKey,
        fileUrl: input.fileUrl,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        uploadedByUserId,
      },
      include: MATERIAL_INCLUDE,
    });
  }

  findForClass(schoolId: string, classId: string, subject?: string) {
    return this.prisma.studyMaterial.findMany({
      where: { schoolId, classId, ...(subject ? { subject } : {}) },
      orderBy: [{ subject: "asc" }, { createdAt: "desc" }],
      include: MATERIAL_INCLUDE,
    });
  }

  /**
   * A student's library is their class's library. Reading it through the
   * student rather than the class id means the caller never has to know which
   * class the child is in, and a parent can't widen the request to another one.
   */
  async findForStudent(schoolId: string, studentId: string, subject?: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      select: { classId: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    // Not yet placed in a class: an empty library, not an error.
    if (!student.classId) return [];
    return this.findForClass(schoolId, student.classId, subject);
  }

  /** Subjects that actually have material, for a filter that never shows an empty tab. */
  async subjectsForClass(schoolId: string, classId: string) {
    const rows = await this.prisma.studyMaterial.findMany({
      where: { schoolId, classId },
      distinct: ["subject"],
      select: { subject: true },
      orderBy: { subject: "asc" },
    });
    return rows.map((row) => row.subject);
  }

  /**
   * Only the teacher who published a file may withdraw it; a school admin may
   * withdraw any. A colleague deleting your notes is not a permission anyone
   * asked for, and `assertCanTeachClass` alone would grant it.
   */
  async withdraw(
    schoolId: string,
    id: string,
    user: { id: string; role: string },
  ) {
    const material = await this.prisma.studyMaterial.findFirst({
      where: { id, schoolId },
      select: { id: true, uploadedByUserId: true },
    });
    if (!material) throw new NotFoundException("Material not found");
    if (user.role !== "SCHOOL_ADMIN" && material.uploadedByUserId !== user.id) {
      throw new ForbiddenException("Only whoever published this can withdraw it");
    }

    // The stored object is deliberately left in place: the row is the index,
    // and an orphaned blob behind an unguessable key is cheaper than a delete
    // that half-succeeds and leaves a link pointing at nothing.
    await this.prisma.studyMaterial.delete({ where: { id } });
  }
}
