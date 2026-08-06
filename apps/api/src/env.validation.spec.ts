import { validateEnv } from "./env.validation";

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

  it("refuses to boot in production with a placeholder JWT secret", () => {
    expect(() =>
      validateEnv({ ...validBase, NODE_ENV: "production", JWT_ACCESS_SECRET: "change-me-access" }),
    ).toThrow(/placeholder/);
  });

  it("allows a real secret in production", () => {
    expect(() =>
      validateEnv({ ...validBase, NODE_ENV: "production" }),
    ).not.toThrow();
  });
});
