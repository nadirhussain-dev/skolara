import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateInvoiceInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateInvoiceInput) {
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
