import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateInvoiceInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Raises an invoice against a student.
   *
   * The controller has already refused a `schoolId` that isn't the caller's,
   * but that alone doesn't make the write tenant-safe: `studentId` is a
   * caller-supplied id too, and without this check an admin could bill a
   * student at another school — a row that then shows up in that family's app
   * and in the wrong school's collections.
   */
  async create(input: CreateInvoiceInput) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: input.studentId, schoolId: input.schoolId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    return this.prisma.invoice.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        term: input.term,
        amountDue: input.amountDue,
        dueDate: input.dueDate,
      },
    });
  }

  findAllForStudent(schoolId: string, studentId: string) {
    return this.prisma.invoice.findMany({
      where: { schoolId, studentId },
      orderBy: { dueDate: "desc" },
    });
  }

  async findOne(schoolId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, schoolId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }
}
