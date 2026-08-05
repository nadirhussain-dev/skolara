import { Injectable } from "@nestjs/common";
import type { CreatePayslipInput } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  generate(schoolId: string, input: CreatePayslipInput) {
    const netPay = input.basicSalary - input.deductions;

    return this.prisma.payslip.upsert({
      where: { staffUserId_month: { staffUserId: input.staffUserId, month: input.month } },
      create: {
        schoolId,
        staffUserId: input.staffUserId,
        month: input.month,
        basicSalary: input.basicSalary,
        deductions: input.deductions,
        netPay,
      },
      update: {
        basicSalary: input.basicSalary,
        deductions: input.deductions,
        netPay,
        generatedAt: new Date(),
      },
    });
  }

  findForStaff(schoolId: string, staffUserId: string) {
    return this.prisma.payslip.findMany({
      where: { schoolId, staffUserId },
      orderBy: { month: "desc" },
    });
  }
}
