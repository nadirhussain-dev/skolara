import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DB_LATENCY_DEGRADED_MS,
  HEAP_DEGRADED_FRACTION,
  type CheckState,
  type HealthCheck,
  type HealthDetail,
  type IntegrationStatus,
} from "@skolara/types";
import { PrismaService } from "../prisma/prisma.service";

const MB = 1024 * 1024;

/** Worst wins: one DOWN check makes the whole instance DOWN. */
function worst(states: CheckState[]): CheckState {
  if (states.includes("DOWN")) return "DOWN";
  if (states.includes("DEGRADED")) return "DEGRADED";
  return "OK";
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * The detail behind the two load-balancer endpoints.
   *
   * Read live rather than sampled into a table: a health figure written to the
   * database is a figure that survives the thing it describes, and this is
   * cheap enough to answer on demand. The cost of that choice is that it
   * describes *this process* — behind more than one instance, an operator sees
   * whichever one answered, and the honest fix is a metrics backend rather
   * than a table of stale rows.
   */
  async detail(): Promise<HealthDetail> {
    const [database, migrations, estate] = await Promise.all([
      this.databaseCheck(),
      this.migrationState(),
      this.estate(),
    ]);

    const memory = process.memoryUsage();
    const heapCheck: HealthCheck = {
      key: "process",
      label: "API process",
      state:
        memory.heapUsed / memory.heapTotal > HEAP_DEGRADED_FRACTION ? "DEGRADED" : "OK",
      detail: `Heap ${Math.round(memory.heapUsed / MB)}MB of ${Math.round(memory.heapTotal / MB)}MB`,
    };

    const migrationCheck: HealthCheck = {
      key: "migrations",
      label: "Schema migrations",
      // A migration recorded as started and never finished means the schema is
      // somewhere between two versions. Worth shouting about — the API will
      // appear to work right up to the first query that needs the missing half.
      state: migrations.failedMigrations > 0 ? "DOWN" : "OK",
      detail:
        migrations.failedMigrations > 0
          ? `${migrations.failedMigrations} migration${migrations.failedMigrations === 1 ? "" : "s"} did not finish`
          : `${migrations.appliedMigrations} applied`,
    };

    const checks = [database, migrationCheck, heapCheck];

    return {
      status: worst(checks.map((check) => check.state)),
      checkedAt: new Date().toISOString(),
      environment: this.config.get<string>("NODE_ENV") ?? "development",
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / MB),
        heapTotalMb: Math.round(memory.heapTotal / MB),
        rssMb: Math.round(memory.rss / MB),
      },
      checks,
      integrations: this.integrations(),
      database: migrations,
      estate,
    };
  }

  private async databaseCheck(): Promise<HealthCheck> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - started;
      return {
        key: "database",
        label: "PostgreSQL",
        state: latencyMs > DB_LATENCY_DEGRADED_MS ? "DEGRADED" : "OK",
        latencyMs,
        detail:
          latencyMs > DB_LATENCY_DEGRADED_MS
            ? "Reachable but slow — check the connection pool"
            : undefined,
      };
    } catch {
      return {
        key: "database",
        label: "PostgreSQL",
        state: "DOWN",
        latencyMs: Date.now() - started,
        detail: "Unreachable",
      };
    }
  }

  /**
   * Read from Prisma's own `_prisma_migrations` table rather than counted from
   * the filesystem: what matters is what the database believes it has applied,
   * not what shipped in the image.
   */
  private async migrationState() {
    try {
      const rows = await this.prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`
        SELECT "migration_name", "finished_at"
        FROM "_prisma_migrations"
        ORDER BY "started_at" ASC
      `;
      const finished = rows.filter((row) => row.finished_at !== null);
      return {
        appliedMigrations: finished.length,
        failedMigrations: rows.length - finished.length,
        latestMigration: finished.at(-1)?.migration_name ?? null,
      };
    } catch {
      // No migrations table at all — a database someone pushed a schema into
      // directly. Reported as zero rather than as an error, because the
      // database check above is the one that says whether it is reachable.
      return { appliedMigrations: 0, failedMigrations: 0, latestMigration: null };
    }
  }

  private async estate() {
    const [schools, activeSchools, users, students] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({
        where: { subscriptionStatus: { in: ["ACTIVE", "TRIAL"] } },
      }),
      this.prisma.user.count(),
      this.prisma.studentProfile.count(),
    ]);
    return { schools, activeSchools, users, students };
  }

  /**
   * Which optional integrations are wired up.
   *
   * Every one of these falls back to a console or local-disk stub when
   * unconfigured, which is what makes a clean checkout run end to end — and
   * also what makes an unconfigured production deploy silently wrong. This
   * list exists so that is visible rather than discovered.
   */
  private integrations(): IntegrationStatus[] {
    const has = (key: string) => Boolean(this.config.get<string>(key));

    const storageLive =
      has("SUPABASE_URL") && has("SUPABASE_SERVICE_ROLE_KEY") && has("SUPABASE_STORAGE_BUCKET");
    const pushOff = this.config.get<string>("EXPO_PUSH_ENABLED") === "false";

    return [
      {
        key: "storage",
        label: "File storage",
        state: storageLive ? "LIVE" : "STUB",
        detail: storageLive
          ? "Supabase Storage"
          : "Local disk — uploads are lost when the container restarts",
      },
      {
        key: "push",
        label: "Push notifications",
        state: pushOff ? "OFF" : "LIVE",
        detail: pushOff
          ? "Disabled by EXPO_PUSH_ENABLED=false"
          : "Expo — needs an EAS project id in the app to reach devices",
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        state:
          has("WHATSAPP_ACCESS_TOKEN") && has("WHATSAPP_PHONE_NUMBER_ID") ? "LIVE" : "STUB",
        detail:
          has("WHATSAPP_ACCESS_TOKEN") && has("WHATSAPP_PHONE_NUMBER_ID")
            ? "Meta Cloud API"
            : "Logged to console, not sent",
      },
      {
        key: "email",
        label: "Email",
        state: has("RESEND_API_KEY") && has("EMAIL_FROM") ? "LIVE" : "STUB",
        detail:
          has("RESEND_API_KEY") && has("EMAIL_FROM")
            ? "Resend"
            : "Logged to console, not sent",
      },
      {
        key: "ai",
        label: "AI (report comments, defaulter risk)",
        state: has("ANTHROPIC_API_KEY") ? "LIVE" : "STUB",
        detail: has("ANTHROPIC_API_KEY")
          ? "Anthropic API"
          : "Deterministic fallback — never hard-fails, but comments are generic",
      },
      {
        key: "stripe",
        label: "Card payments",
        state: has("STRIPE_SECRET_KEY") ? "LIVE" : "OFF",
        detail: has("STRIPE_SECRET_KEY")
          ? has("STRIPE_WEBHOOK_SECRET")
            ? "Stripe, with webhook verification"
            : "Stripe key set but STRIPE_WEBHOOK_SECRET is missing — webhooks will be rejected"
          : "Off — bank transfer is the primary method anyway",
      },
      {
        key: "docs",
        label: "Swagger UI",
        state: this.config.get<string>("ENABLE_API_DOCS") === "true" ? "LIVE" : "OFF",
        detail:
          this.config.get<string>("ENABLE_API_DOCS") === "true"
            ? "Served at /docs — this is a B2B API, so consider turning it off"
            : "Off outside development",
      },
    ];
  }
}
