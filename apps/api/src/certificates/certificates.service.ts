import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { IssueCertificateInput, UploadedFile } from "@skolara/types";
import { DocumentsService } from "../documents/documents.service";
import { PrismaService } from "../prisma/prisma.service";
import { certificateDefinition } from "./certificate.template";

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private documents: DocumentsService,
  ) {}

  async issue(
    schoolId: string,
    input: IssueCertificateInput,
  ): Promise<UploadedFile & { serial: string }> {
    if (input.kind === "LEAVING" && !input.leavingDate) {
      throw new BadRequestException(
        "A leaving certificate needs the date the student left",
      );
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: { id: input.studentId, schoolId },
      include: {
        user: { select: { firstName: true, lastName: true, createdAt: true } },
        class: { select: { name: true, section: true } },
        school: { select: { name: true, primaryColor: true } },
        parentLinks: {
          take: 1,
          include: { parentUser: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!student) throw new NotFoundException("Student not found");

    const parent = student.parentLinks[0]?.parentUser;

    const file = await this.documents.renderAndStore(
      schoolId,
      certificateDefinition({
        school: student.school,
        kind: input.kind,
        serial: this.serial(input.studentId, input.kind),
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        fatherName: parent ? `${parent.firstName} ${parent.lastName}` : null,
        admissionNumber: student.admissionNumber,
        className: student.class
          ? `${student.class.name} ${student.class.section}`
          : null,
        dateOfBirth: student.dateOfBirth,
        // The student user record is created at admission, so its timestamp is
        // when they joined.
        enrolledOn: student.user.createdAt,
        leavingDate: input.leavingDate ?? null,
        remarks: input.remarks ?? null,
        issuedOn: new Date(),
      }),
    );

    return { ...file, serial: this.serial(input.studentId, input.kind) };
  }

  /**
   * A human-quotable reference for the certificate.
   *
   * Deliberately derived rather than stored: certificates are re-issued
   * routinely (lost copies, corrections), and a sequence would either produce
   * a new number for the same document or need a table whose only job is
   * counting. Same student and kind always yields the same serial, which is
   * what an office checking a certificate against its records wants.
   */
  private serial(studentId: string, kind: string): string {
    const short = studentId.replace(/-/g, "").slice(0, 6).toUpperCase();
    return `${kind.slice(0, 3)}-${short}`;
  }
}
