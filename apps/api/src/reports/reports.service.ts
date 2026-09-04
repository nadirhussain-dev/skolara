import { Injectable } from "@nestjs/common";
import { PLANS } from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";
import { toCsv } from "./csv";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Platform revenue by school — what the Super Admin's MRR figure is made of.
   *
   * Enterprise schools are listed with a blank price rather than zero: their
   * price is negotiated and unknown here, and a zero would quietly understate
   * revenue for anyone summing the column.
   */
  async platformRevenueCsv(): Promise<string> {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { studentProfiles: true } } },
    });

    return toCsv(
      [
        "School",
        "Subdomain",
        "Plan",
        "Status",
        "Students",
        "Monthly PKR",
        "Annual PKR",
        "Joined",
      ],
      schools.map((school) => {
        const price = PLANS[school.plan].monthlyPricePkr;
        const billable = school.subscriptionStatus === "ACTIVE" && price !== null;
        return [
          school.name,
          school.subdomain,
          school.plan,
          school.subscriptionStatus,
          school._count.studentProfiles,
          billable ? price : "",
          billable ? price * 12 : "",
          school.createdAt.toISOString().slice(0, 10),
        ];
      }),
    );
  }

  /**
   * Fee collection for one school, invoice by invoice.
   *
   * Outstanding is computed here rather than read from a column so it can
   * never disagree with the two amounts printed beside it.
   */
  async feeCollectionCsv(schoolId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId },
      orderBy: [{ dueDate: "asc" }],
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
    });

    return toCsv(
      [
        "Student",
        "Admission no.",
        "Class",
        "Term",
        "Due",
        "Paid",
        "Outstanding",
        "Status",
        "Due date",
      ],
      invoices.map((invoice) => {
        const due = Number(invoice.amountDue);
        const paid = Number(invoice.amountPaid);
        return [
          `${invoice.student.user.firstName} ${invoice.student.user.lastName}`,
          invoice.student.admissionNumber,
          invoice.student.class
            ? `${invoice.student.class.name} ${invoice.student.class.section}`
            : "",
          invoice.term,
          due.toFixed(2),
          paid.toFixed(2),
          Math.max(due - paid, 0).toFixed(2),
          invoice.status,
          invoice.dueDate.toISOString().slice(0, 10),
        ];
      }),
    );
  }
}
