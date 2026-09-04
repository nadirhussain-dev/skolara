import { DB_LATENCY_DEGRADED_MS } from "@skolara/types";
import { HealthService } from "./health.service";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../prisma/prisma.service";

describe("HealthService", () => {
  let prisma: {
    $queryRaw: jest.Mock;
    school: { count: jest.Mock };
    user: { count: jest.Mock };
    studentProfile: { count: jest.Mock };
  };
  let env: Record<string, string>;
  let service: HealthService;

  /** `$queryRaw` serves both the SELECT 1 probe and the migrations read. */
  function migrations(rows: { migration_name: string; finished_at: Date | null }[]) {
    prisma.$queryRaw.mockImplementation((query: unknown) => {
      const text = Array.isArray(query) ? query.join("") : String(query);
      if (text.includes("_prisma_migrations")) return Promise.resolve(rows);
      return Promise.resolve([{ "?column?": 1 }]);
    });
  }

  beforeEach(() => {
    env = {};
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      school: { count: jest.fn().mockResolvedValue(3) },
      user: { count: jest.fn().mockResolvedValue(40) },
      studentProfile: { count: jest.fn().mockResolvedValue(25) },
    };
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    service = new HealthService(prisma as unknown as PrismaService, config);
    migrations([{ migration_name: "001_init", finished_at: new Date() }]);
  });

  describe("overall status", () => {
    it("is OK when every check passes", async () => {
      const detail = await service.detail();

      expect(detail.status).toBe("OK");
      expect(detail.checks.map((check) => check.key)).toEqual([
        "database",
        "migrations",
        "process",
      ]);
    });

    it("is DOWN when the database can't be reached", async () => {
      prisma.$queryRaw.mockRejectedValue(new Error("ECONNREFUSED"));

      const detail = await service.detail();

      expect(detail.status).toBe("DOWN");
      expect(detail.checks[0]).toEqual(
        expect.objectContaining({ key: "database", state: "DOWN", detail: "Unreachable" }),
      );
    });

    it("is DEGRADED when the database answers slowly", async () => {
      const realNow = Date.now;
      let call = 0;
      // First pair of Date.now() calls straddles the probe.
      jest.spyOn(Date, "now").mockImplementation(() => {
        call += 1;
        return call === 1 ? 0 : DB_LATENCY_DEGRADED_MS + 50;
      });

      const detail = await service.detail();
      Date.now = realNow;

      expect(detail.status).toBe("DEGRADED");
      expect(detail.checks[0].state).toBe("DEGRADED");
      expect(detail.checks[0].latencyMs).toBeGreaterThan(DB_LATENCY_DEGRADED_MS);
    });

    it("is DOWN when a migration never finished", async () => {
      // The schema is between two versions: the API works until the first
      // query that needs the missing half.
      migrations([
        { migration_name: "001_init", finished_at: new Date() },
        { migration_name: "002_half_done", finished_at: null },
      ]);

      const detail = await service.detail();

      expect(detail.status).toBe("DOWN");
      expect(detail.database.failedMigrations).toBe(1);
      expect(detail.database.appliedMigrations).toBe(1);
      expect(detail.database.latestMigration).toBe("001_init");
    });

    it("survives a database with no migrations table", async () => {
      prisma.$queryRaw.mockImplementation((query: unknown) => {
        const text = Array.isArray(query) ? query.join("") : String(query);
        if (text.includes("_prisma_migrations")) {
          return Promise.reject(new Error("relation does not exist"));
        }
        return Promise.resolve([{ "?column?": 1 }]);
      });

      const detail = await service.detail();

      expect(detail.database).toEqual({
        appliedMigrations: 0,
        failedMigrations: 0,
        latestMigration: null,
      });
      // The database check, not the migration check, is what reports
      // reachability — so a missing table isn't an outage.
      expect(detail.status).toBe("OK");
    });
  });

  describe("integrations", () => {
    const stateOf = (detail: Awaited<ReturnType<HealthService["detail"]>>, key: string) =>
      detail.integrations.find((integration) => integration.key === key)?.state;

    it("reports stubs when nothing is configured", async () => {
      const detail = await service.detail();

      expect(stateOf(detail, "storage")).toBe("STUB");
      expect(stateOf(detail, "whatsapp")).toBe("STUB");
      expect(stateOf(detail, "email")).toBe("STUB");
      expect(stateOf(detail, "ai")).toBe("STUB");
      expect(stateOf(detail, "stripe")).toBe("OFF");
    });

    it("needs all three Supabase vars before calling storage live", async () => {
      env.SUPABASE_URL = "https://x.supabase.co";
      env.SUPABASE_SERVICE_ROLE_KEY = "key";

      expect(stateOf(await service.detail(), "storage")).toBe("STUB");

      env.SUPABASE_STORAGE_BUCKET = "uploads";
      expect(stateOf(await service.detail(), "storage")).toBe("LIVE");
    });

    it("warns when a Stripe key is set without a webhook secret", async () => {
      env.STRIPE_SECRET_KEY = "sk_test";

      const detail = await service.detail();
      const stripe = detail.integrations.find((integration) => integration.key === "stripe");

      expect(stripe?.state).toBe("LIVE");
      expect(stripe?.detail).toMatch(/STRIPE_WEBHOOK_SECRET is missing/);
    });

    it("reports push as off when explicitly disabled", async () => {
      env.EXPO_PUSH_ENABLED = "false";

      expect(stateOf(await service.detail(), "push")).toBe("OFF");
    });

    it("never returns a configured secret's value", async () => {
      env.WHATSAPP_ACCESS_TOKEN = "super-secret-token";
      env.WHATSAPP_PHONE_NUMBER_ID = "123";
      env.ANTHROPIC_API_KEY = "sk-ant-secret";

      const detail = await service.detail();

      const serialised = JSON.stringify(detail);
      expect(serialised).not.toContain("super-secret-token");
      expect(serialised).not.toContain("sk-ant-secret");
    });
  });

  describe("estate", () => {
    it("counts trialling schools as active", async () => {
      const detail = await service.detail();

      expect(detail.estate).toEqual({
        schools: 3,
        activeSchools: 3,
        users: 40,
        students: 25,
      });
      expect(prisma.school.count).toHaveBeenCalledWith({
        where: { subscriptionStatus: { in: ["ACTIVE", "TRIAL"] } },
      });
    });
  });

  describe("process", () => {
    it("reports uptime and memory of the answering process", async () => {
      const detail = await service.detail();

      expect(detail.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(detail.memory.heapUsedMb).toBeGreaterThan(0);
      expect(detail.nodeVersion).toBe(process.version);
    });
  });
});
