import { Injectable, NotFoundException } from "@nestjs/common";
import type { DefaulterRisk, PlatformAnalytics, SchoolAnalytics } from "@skolara/types";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async platform(): Promise<PlatformAnalytics> {
    const schools = await this.prisma.school.findMany();
    const totalActiveUsers = await this.prisma.user.count({ where: { isActive: true } });

    const schoolsByStatus: Record<string, number> = {};
    const schoolsByPlan: Record<string, number> = {};
    for (const school of schools) {
      schoolsByStatus[school.subscriptionStatus] = (schoolsByStatus[school.subscriptionStatus] ?? 0) + 1;
      schoolsByPlan[school.plan] = (schoolsByPlan[school.plan] ?? 0) + 1;
    }

    return {
      totalSchools: schools.length,
      schoolsByStatus,
      schoolsByPlan,
      totalActiveUsers,
    };
  }

  async school(schoolId: string): Promise<SchoolAnalytics> {
    const [studentCount, teacherCount, pendingPaymentSubmissions] = await Promise.all([
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.teacherProfile.count({ where: { schoolId } }),
      this.prisma.paymentSubmission.count({
        where: { schoolId, status: "PENDING_VERIFICATION" },
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: { gte: thirtyDaysAgo } },
      select: { status: true },
    });
    const attendanceRateLast30Days =
      recentAttendance.length > 0
        ? (recentAttendance.filter((r) => r.status === "PRESENT").length /
            recentAttendance.length) *
          100
        : 0;

    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId },
      select: { amountDue: true, amountPaid: true },
    });
    const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const feeCollectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    return {
      studentCount,
      teacherCount,
      attendanceRateLast30Days,
      feeCollectionRate,
      pendingPaymentSubmissions,
    };
  }

  async defaulterRisk(schoolId: string, studentId: string): Promise<DefaulterRisk> {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException("Student not found");

    const [rejectedCount, needsInfoCount, overdueInvoices] = await Promise.all([
      this.prisma.paymentSubmission.count({
        where: { schoolId, studentId, status: "REJECTED" },
      }),
      this.prisma.paymentSubmission.count({
        where: { schoolId, studentId, status: "NEEDS_INFO" },
      }),
      this.prisma.invoice.findMany({
        where: {
          schoolId,
          studentId,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    let score = 0;
    const reasons: string[] = [];

    if (overdueInvoices.length > 0) {
      score += Math.min(overdueInvoices.length * 25, 50);
      reasons.push(`${overdueInvoices.length} overdue invoice(s)`);
    }
    if (rejectedCount > 0) {
      score += Math.min(rejectedCount * 15, 30);
      reasons.push(`${rejectedCount} rejected payment submission(s)`);
    }
    if (needsInfoCount > 0) {
      score += Math.min(needsInfoCount * 10, 20);
      reasons.push(`${needsInfoCount} submission(s) needing more info`);
    }
    score = Math.min(score, 100);

    const riskLevel = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
    if (reasons.length === 0) reasons.push("No payment history concerns found");

    return { studentId, riskScore: score, riskLevel, reasons };
  }

  async defaulterRiskWithExplanation(schoolId: string, studentId: string) {
    const risk = await this.defaulterRisk(schoolId, studentId);
    const student = await this.prisma.studentProfile.findFirstOrThrow({
      where: { id: studentId, schoolId },
      include: { user: true },
    });
    const explanation = await this.aiService.explainDefaulterRisk({
      firstName: student.user.firstName,
      riskLevel: risk.riskLevel,
      reasons: risk.reasons,
    });
    return { ...risk, explanation };
  }
}
