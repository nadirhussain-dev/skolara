import { z } from "zod";

// Fails fast on boot if required config is missing/malformed, instead of
// surfacing as a cryptic runtime error the first time a route needs it.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Comma-separated list of allowed browser origins. Unset = reflect no origin
  // (same-origin/non-browser only) in production; permissive in development.
  CORS_ORIGINS: z.string().optional(),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),

  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (result.data.NODE_ENV === "production") {
    const insecureDefaults = ["change-me-access", "change-me-refresh", "dev-access-secret-change-me", "dev-refresh-secret-change-me"];
    if (insecureDefaults.includes(result.data.JWT_ACCESS_SECRET) || insecureDefaults.includes(result.data.JWT_REFRESH_SECRET)) {
      throw new Error(
        "Refusing to start in production with a placeholder JWT secret — set real JWT_ACCESS_SECRET/JWT_REFRESH_SECRET values.",
      );
    }
  }

  return result.data;
}
