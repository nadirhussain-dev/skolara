import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

/** Consecutive failures before an account is locked. */
const MAX_FAILURES = 5;
/** Failures further apart than this don't count towards the same streak. */
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const BASE_LOCK_MS = 15 * 60 * 1000;
const MAX_LOCK_MS = 60 * 60 * 1000;
/** Upper bound on tracked keys, so junk logins can't grow memory without limit. */
const MAX_TRACKED = 50_000;

interface Attempts {
  failures: number;
  lastFailureAt: number;
  /** How many times this key has been locked; each lock lasts twice the last. */
  lockouts: number;
  lockedUntil: number;
}

/**
 * Per-account brute-force protection for sign-in.
 *
 * The route-level rate limit counts requests per IP address, which does
 * nothing against an attacker spreading guesses for one account across many
 * addresses. This counts failures per account instead: five wrong passwords
 * in a row lock the account for 15 minutes, doubling up to an hour if it
 * keeps happening.
 *
 * Keys are tracked whether or not an account exists behind them, so being
 * locked out says nothing about whether the email is registered.
 *
 * State is held in memory, per API process — the same trade-off the request
 * rate limiter makes. Running several API instances multiplies the allowance
 * by the instance count; move this (and the throttler) to shared storage
 * before scaling out.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, Attempts>();

  /** The same account must map to the same key however the email was typed. */
  static keyFor(email: string, subdomain?: string | null): string {
    return `${(subdomain ?? "").trim().toLowerCase()}|${email.trim().toLowerCase()}`;
  }

  /** Throws 429 while the account is locked. Call before checking the password. */
  assertNotLocked(key: string, now: number = Date.now()): void {
    const entry = this.attempts.get(key);
    if (!entry || entry.lockedUntil <= now) return;

    const minutes = Math.max(1, Math.ceil((entry.lockedUntil - now) / 60_000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`,
        error: "Too Many Requests",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const previous = this.attempts.get(key);
    const streakContinues = previous && now - previous.lastFailureAt <= FAILURE_WINDOW_MS;
    const entry: Attempts = {
      failures: streakContinues ? previous.failures + 1 : 1,
      lastFailureAt: now,
      lockouts: previous?.lockouts ?? 0,
      lockedUntil: previous?.lockedUntil ?? 0,
    };

    if (entry.failures >= MAX_FAILURES) {
      entry.lockouts += 1;
      entry.lockedUntil = now + Math.min(BASE_LOCK_MS * 2 ** (entry.lockouts - 1), MAX_LOCK_MS);
      entry.failures = 0;
    }

    // Re-insert so the Map's insertion order doubles as least-recently-failed.
    this.attempts.delete(key);
    this.attempts.set(key, entry);
    this.prune(now);
  }

  /** A correct password clears the slate, including the lock-length escalation. */
  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    if (this.attempts.size <= MAX_TRACKED) return;
    for (const [key, entry] of this.attempts) {
      const idle = now - entry.lastFailureAt > MAX_LOCK_MS && entry.lockedUntil <= now;
      if (idle || this.attempts.size > MAX_TRACKED) this.attempts.delete(key);
      if (this.attempts.size <= MAX_TRACKED * 0.9) break;
    }
  }
}
