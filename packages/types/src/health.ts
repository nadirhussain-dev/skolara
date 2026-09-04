/**
 * What the platform owner's health dashboard reads.
 *
 * Nothing here is a secret value — only whether one is configured. A dashboard
 * that printed keys would be a credential store with a nicer font, and the
 * question an operator actually has is "is WhatsApp wired up", never "what is
 * the token".
 */

export type IntegrationState = "LIVE" | "STUB" | "OFF";

export interface IntegrationStatus {
  key: string;
  label: string;
  state: IntegrationState;
  /** What happens in this state — the bit that saves a support round-trip. */
  detail: string;
}

export type CheckState = "OK" | "DEGRADED" | "DOWN";

export interface HealthCheck {
  key: string;
  label: string;
  state: CheckState;
  /** Round-trip in milliseconds, where the check measures one. */
  latencyMs?: number;
  detail?: string;
}

export interface HealthDetail {
  /** Worst state across every check — what a status light should show. */
  status: CheckState;
  checkedAt: string;
  environment: string;
  /** Seconds since this process started. Resets on deploy, which is the point. */
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  checks: HealthCheck[];
  integrations: IntegrationStatus[];
  database: {
    /** Migrations Prisma has recorded as applied. */
    appliedMigrations: number;
    /** Any migration Prisma recorded as started and never finished. */
    failedMigrations: number;
    latestMigration: string | null;
  };
  estate: {
    schools: number;
    activeSchools: number;
    users: number;
    students: number;
  };
}

/** Milliseconds above which the database is reachable but unhappy. */
export const DB_LATENCY_DEGRADED_MS = 500;
/** Heap fraction above which the process is worth looking at. */
export const HEAP_DEGRADED_FRACTION = 0.9;
