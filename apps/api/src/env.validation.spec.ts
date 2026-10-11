import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateEnv } from "./env.validation";

// Minimal reader for the KEY="value" / KEY=value / # comment lines that
// .env.example uses. Deliberately not dotenv: it isn't a direct dependency of
// this package, so resolving it here would lean on pnpm's hoisting layout.
function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return env;
}

const validBase = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_ACCESS_SECRET: "a-real-secret",
  JWT_REFRESH_SECRET: "another-real-secret",
};

describe("validateEnv", () => {
  it("accepts a minimal valid config and fills in defaults", () => {
    const result = validateEnv(validBase);
    expect(result.PORT).toBe(4000);
    expect(result.NODE_ENV).toBe("development");
    expect(result.JWT_ACCESS_EXPIRES_IN).toBe("15m");
  });

  it("throws when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _omit, ...rest } = validBase;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when JWT secrets are missing", () => {
    const { JWT_ACCESS_SECRET: _omit, ...rest } = validBase;
    expect(() => validateEnv(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("coerces PORT to a number", () => {
    const result = validateEnv({ ...validBase, PORT: "8080" });
    expect(result.PORT).toBe(8080);
  });

  // An optional var written as FOO="" is how .env.example marks "leave this
  // unset". Coercion used to read that as 0 and reject it.
  it("treats an empty optional number as unset rather than zero", () => {
    const result = validateEnv({ ...validBase, STORAGE_SIGNED_URL_TTL_SECONDS: "" });
    expect(result.STORAGE_SIGNED_URL_TTL_SECONDS).toBeUndefined();
  });

  it("falls back to the default PORT when it is set but empty", () => {
    expect(validateEnv({ ...validBase, PORT: "" }).PORT).toBe(4000);
  });

  it("still rejects a non-positive TTL that was set deliberately", () => {
    expect(() =>
      validateEnv({ ...validBase, STORAGE_SIGNED_URL_TTL_SECONDS: "0" }),
    ).toThrow(/STORAGE_SIGNED_URL_TTL_SECONDS/);
  });

  // The README tells a new contributor to `cp .env.example .env`, so the
  // example file has to be a config the API will actually boot with.
  it("accepts .env.example as copied, so a clean checkout boots", () => {
    const example = parseEnvFile(
      readFileSync(join(__dirname, "..", ".env.example"), "utf8"),
    );
    expect(example.DATABASE_URL).toBeTruthy();
    expect(() => validateEnv(example)).not.toThrow();
  });

  it("refuses to boot in production with a placeholder JWT secret", () => {
    expect(() =>
      validateEnv({ ...validBase, NODE_ENV: "production", JWT_ACCESS_SECRET: "change-me-access" }),
    ).toThrow(/placeholder/);
  });

  const strongAccess = "a".repeat(20) + "Kq7ZpX2mVb9T4wLs8RnE";
  const strongRefresh = "b".repeat(20) + "Hy3UcF6jNd1G5oMt0AeW";
  const production = {
    ...validBase,
    NODE_ENV: "production",
    JWT_ACCESS_SECRET: strongAccess,
    JWT_REFRESH_SECRET: strongRefresh,
  };

  it("allows real secrets in production", () => {
    expect(() => validateEnv(production)).not.toThrow();
  });

  it("refuses a short JWT secret in production", () => {
    expect(() => validateEnv({ ...production, JWT_ACCESS_SECRET: "a-real-secret" })).toThrow(
      /JWT_ACCESS_SECRET must be at least 32/,
    );
    expect(() => validateEnv({ ...production, JWT_REFRESH_SECRET: "short" })).toThrow(
      /JWT_REFRESH_SECRET must be at least 32/,
    );
  });

  it("refuses the same secret for access and refresh tokens in production", () => {
    expect(() => validateEnv({ ...production, JWT_REFRESH_SECRET: strongAccess })).toThrow(
      /must be different/,
    );
  });

  it("still lets short secrets through in development, so a clean checkout boots", () => {
    expect(() => validateEnv(validBase)).not.toThrow();
  });

  it("trusts no proxy unless told how many there are", () => {
    expect(validateEnv(validBase).TRUST_PROXY).toBe(0);
    expect(validateEnv({ ...validBase, TRUST_PROXY: "" }).TRUST_PROXY).toBe(0);
    expect(validateEnv({ ...validBase, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
  });

  it("rejects a proxy count that isn't a small whole number", () => {
    expect(() => validateEnv({ ...validBase, TRUST_PROXY: "true" })).toThrow();
    expect(() => validateEnv({ ...validBase, TRUST_PROXY: "-1" })).toThrow();
    expect(() => validateEnv({ ...validBase, TRUST_PROXY: "99" })).toThrow();
  });
});
