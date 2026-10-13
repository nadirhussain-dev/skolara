import { HttpException } from "@nestjs/common";
import { LoginAttemptsService } from "./login-attempts.service";

describe("LoginAttemptsService", () => {
  const MINUTE = 60_000;
  const T0 = 1_800_000_000_000;
  let service: LoginAttemptsService;
  const key = LoginAttemptsService.keyFor("parent@school.test", "school1");

  const fail = (times: number, at: number, k = key) => {
    for (let i = 0; i < times; i++) service.recordFailure(k, at);
  };

  beforeEach(() => {
    service = new LoginAttemptsService();
  });

  it("allows sign-in attempts below the failure limit", () => {
    fail(4, T0);
    expect(() => service.assertNotLocked(key, T0)).not.toThrow();
  });

  it("locks the account on the fifth consecutive failure", () => {
    fail(5, T0);
    expect(() => service.assertNotLocked(key, T0 + 1)).toThrow(HttpException);
  });

  it("answers 429 and says how long to wait", () => {
    fail(5, T0);
    try {
      service.assertNotLocked(key, T0 + MINUTE);
      throw new Error("expected a lock");
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).message).toMatch(/14 minutes/);
    }
  });

  it("unlocks after 15 minutes", () => {
    fail(5, T0);
    expect(() => service.assertNotLocked(key, T0 + 15 * MINUTE)).not.toThrow();
  });

  it("doubles the lock each time it is triggered again, up to an hour", () => {
    fail(5, T0); // 15 min
    const second = T0 + 16 * MINUTE;
    fail(5, second); // 30 min
    expect(() => service.assertNotLocked(key, second + 29 * MINUTE)).toThrow(HttpException);
    expect(() => service.assertNotLocked(key, second + 30 * MINUTE)).not.toThrow();

    const third = second + 31 * MINUTE;
    fail(5, third); // 60 min
    const fourth = third + 61 * MINUTE;
    fail(5, fourth); // would be 120, capped at 60
    expect(() => service.assertNotLocked(key, fourth + 59 * MINUTE)).toThrow(HttpException);
    expect(() => service.assertNotLocked(key, fourth + 60 * MINUTE)).not.toThrow();
  });

  it("forgets failures once a correct password is entered", () => {
    fail(4, T0);
    service.recordSuccess(key);
    fail(4, T0 + MINUTE);
    expect(() => service.assertNotLocked(key, T0 + MINUTE)).not.toThrow();
  });

  it("does not count failures more than 15 minutes apart as one streak", () => {
    fail(4, T0);
    fail(1, T0 + 16 * MINUTE);
    expect(() => service.assertNotLocked(key, T0 + 16 * MINUTE)).not.toThrow();
  });

  it("locks one account without touching another", () => {
    fail(5, T0);
    const other = LoginAttemptsService.keyFor("someone-else@school.test", "school1");
    expect(() => service.assertNotLocked(other, T0)).not.toThrow();
  });

  it("treats the same email at two schools as two accounts", () => {
    fail(5, T0);
    const elsewhere = LoginAttemptsService.keyFor("parent@school.test", "school2");
    expect(() => service.assertNotLocked(elsewhere, T0)).not.toThrow();
  });

  it("cannot be sidestepped by changing the case or padding of the email", () => {
    fail(3, T0, LoginAttemptsService.keyFor("Parent@School.test ", "School1"));
    fail(2, T0, LoginAttemptsService.keyFor(" parent@school.TEST", "school1"));
    expect(() => service.assertNotLocked(key, T0)).toThrow(HttpException);
  });

  it("keeps memory bounded under a flood of made-up emails", () => {
    for (let i = 0; i < 50_500; i++) {
      service.recordFailure(LoginAttemptsService.keyFor(`junk${i}@x.test`), T0);
    }
    const tracked = (service as unknown as { attempts: Map<string, unknown> }).attempts.size;
    expect(tracked).toBeLessThanOrEqual(50_000);
  });
});
