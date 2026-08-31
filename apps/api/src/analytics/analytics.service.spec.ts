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
