import { AnalyticsService } from "./analytics.service";
import type { AiService } from "../ai/ai.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AnalyticsService.platform", () => {
  let prisma: { school: { findMany: jest.Mock }; user: { count: jest.Mock } };
  let service: AnalyticsService;

  const DAY = 24 * 60 * 60 * 1000;

  function school(overrides: Record<string, unknown> = {}) {
    return {
      plan: "BASIC",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: null,
      createdAt: new Date(Date.now() - 100 * DAY),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      school: { findMany: jest.fn().mockResolvedValue([]) },
      user: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new AnalyticsService(
      prisma as unknown as PrismaService,
      {} as unknown as AiService,
    );
  });

  it("sums MRR from published plan pricing and derives ARR", async () => {
    prisma.school.findMany.mockResolvedValue([
      school({ plan: "BASIC" }), // 3,000
      school({ plan: "PREMIUM" }), // 15,000
    ]);

    const result = await service.platform();

    expect(result.mrrPkr).toBe(18_000);
    expect(result.arrPkr).toBe(216_000);
  });

  it("excludes trials from MRR — an unpaid school isn't revenue", async () => {
    prisma.school.findMany.mockResolvedValue([
      school({ plan: "PREMIUM", subscriptionStatus: "TRIAL" }),
      school({ plan: "PREMIUM", subscriptionStatus: "PENDING" }),
      school({ plan: "PREMIUM", subscriptionStatus: "SUSPENDED" }),
    ]);

    const result = await service.platform();
    expect(result.mrrPkr).toBe(0);
  });

  it("contributes nothing for enterprise, and says how many were skipped", async () => {
    prisma.school.findMany.mockResolvedValue([
      school({ plan: "ENTERPRISE" }),
      school({ plan: "BASIC" }),
    ]);

    const result = await service.platform();

    // Enterprise is quoted individually — guessing a figure would misstate MRR.
    expect(result.mrrPkr).toBe(3_000);
    expect(result.enterpriseSchoolsExcludedFromMrr).toBe(1);
  });

  it("counts only trials lapsing within the next week", async () => {
    prisma.school.findMany.mockResolvedValue([
      school({ subscriptionStatus: "TRIAL", trialEndsAt: new Date(Date.now() + 2 * DAY) }),
      school({ subscriptionStatus: "TRIAL", trialEndsAt: new Date(Date.now() + 20 * DAY) }),
      school({ subscriptionStatus: "TRIAL", trialEndsAt: null }),
    ]);

    const result = await service.platform();
    expect(result.trialsEndingSoon).toBe(1);
  });

  it("reports pending approvals and recent signups", async () => {
    prisma.school.findMany.mockResolvedValue([
      school({ subscriptionStatus: "PENDING", createdAt: new Date(Date.now() - 1 * DAY) }),
      school({ subscriptionStatus: "PENDING", createdAt: new Date(Date.now() - 2 * DAY) }),
      school({ createdAt: new Date(Date.now() - 200 * DAY) }),
    ]);

    const result = await service.platform();

    expect(result.pendingApprovals).toBe(2);
    expect(result.schoolsAddedLast30Days).toBe(2);
  });
});

describe("AnalyticsService.schoolToday", () => {
  const NOW = new Date("2026-10-12T06:00:00Z");

  let prisma: {
    paymentSubmission: { findMany: jest.Mock };
    invoice: { findMany: jest.Mock };
    leaveRequest: { count: jest.Mock };
    complaint: { findMany: jest.Mock };
  };
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = {
      paymentSubmission: { findMany: jest.fn().mockResolvedValue([]) },
      invoice: { findMany: jest.fn().mockResolvedValue([]) },
      leaveRequest: { count: jest.fn().mockResolvedValue(0) },
      complaint: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new AnalyticsService(
      prisma as unknown as PrismaService,
      {} as unknown as AiService,
    );
  });

  it("scopes every query to the caller's school", async () => {
    await service.schoolToday("school-1", NOW);

    expect(prisma.paymentSubmission.findMany.mock.calls[0][0].where.schoolId).toBe("school-1");
    expect(prisma.invoice.findMany.mock.calls[0][0].where.schoolId).toBe("school-1");
    expect(prisma.leaveRequest.count.mock.calls[0][0].where.schoolId).toBe("school-1");
    expect(prisma.complaint.findMany.mock.calls[0][0].where.schoolId).toBe("school-1");
  });

  it("totals the verification queue and finds the longest-waiting submission", async () => {
    prisma.paymentSubmission.findMany.mockResolvedValue([
      { amountClaimed: "12500.00", createdAt: new Date("2026-10-11T09:00:00Z") },
      { amountClaimed: "10000.00", createdAt: new Date("2026-10-10T11:12:00Z") },
    ]);

    const { payments } = await service.schoolToday("school-1", NOW);

    expect(payments.pendingCount).toBe(2);
    expect(payments.pendingAmount).toBe(22_500);
    expect(payments.oldestPendingAt).toEqual(new Date("2026-10-10T11:12:00Z"));
  });

  it("only counts submissions still waiting, not ones already reviewed", async () => {
    await service.schoolToday("school-1", NOW);
    expect(prisma.paymentSubmission.findMany.mock.calls[0][0].where.status).toBe(
      "PENDING_VERIFICATION",
    );
  });

  it("looks at invoices due in the current calendar month only", async () => {
    await service.schoolToday("school-1", NOW);

    expect(prisma.invoice.findMany.mock.calls[0][0].where.dueDate).toEqual({
      gte: new Date("2026-10-01T00:00:00Z"),
      lt: new Date("2026-11-01T00:00:00Z"),
    });
  });

  it("rolls the month window over the year end", async () => {
    await service.schoolToday("school-1", new Date("2026-12-31T23:00:00Z"));

    expect(prisma.invoice.findMany.mock.calls[0][0].where.dueDate).toEqual({
      gte: new Date("2026-12-01T00:00:00Z"),
      lt: new Date("2027-01-01T00:00:00Z"),
    });
  });

  it("works out the month's collection rate, counting part payments", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      { amountDue: "12500", amountPaid: "12500", status: "PAID" },
      { amountDue: "12500", amountPaid: "10000", status: "PARTIALLY_PAID" },
      { amountDue: "12500", amountPaid: "0", status: "UNPAID" },
      { amountDue: "12500", amountPaid: "0", status: "OVERDUE" },
    ]);

    const { feesThisMonth } = await service.schoolToday("school-1", NOW);

    expect(feesThisMonth.invoicedAmount).toBe(50_000);
    expect(feesThisMonth.collectedAmount).toBe(22_500);
    expect(feesThisMonth.collectionRate).toBe(45);
    expect(feesThisMonth.paidInvoiceCount).toBe(1);
    expect(feesThisMonth.unpaidInvoiceCount).toBe(3);
  });

  it("does not let an overpaid invoice hide an unpaid one", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      { amountDue: "10000", amountPaid: "20000", status: "PAID" },
      { amountDue: "10000", amountPaid: "0", status: "UNPAID" },
    ]);

    const { feesThisMonth } = await service.schoolToday("school-1", NOW);

    expect(feesThisMonth.collectedAmount).toBe(10_000);
    expect(feesThisMonth.collectionRate).toBe(50);
  });

  it("reports no rate, rather than 0%, when nothing was invoiced this month", async () => {
    const { feesThisMonth } = await service.schoolToday("school-1", NOW);

    expect(feesThisMonth.collectionRate).toBeNull();
    expect(feesThisMonth.invoicedAmount).toBe(0);
  });

  it("counts open and in-progress complaints, with the oldest", async () => {
    prisma.complaint.findMany.mockResolvedValue([
      { createdAt: new Date("2026-10-07T03:40:00Z") },
      { createdAt: new Date("2026-10-12T04:02:00Z") },
    ]);

    const { complaints } = await service.schoolToday("school-1", NOW);

    expect(prisma.complaint.findMany.mock.calls[0][0].where.status).toEqual({
      in: ["OPEN", "IN_PROGRESS"],
    });
    expect(complaints.openCount).toBe(2);
    expect(complaints.oldestOpenAt).toEqual(new Date("2026-10-07T03:40:00Z"));
  });

  it("returns an all-clear shape for a school with nothing waiting", async () => {
    const result = await service.schoolToday("school-1", NOW);

    expect(result.payments).toEqual({ pendingCount: 0, pendingAmount: 0, oldestPendingAt: null });
    expect(result.pendingLeaveRequests).toBe(0);
    expect(result.complaints).toEqual({ openCount: 0, oldestOpenAt: null });
  });
});
