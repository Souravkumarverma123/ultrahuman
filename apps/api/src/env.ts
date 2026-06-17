import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(["development", "prod"]).default("development"),
  BASE_URL: z.string().default("http://localhost:8000"),
  WEB_URL: z.string().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32).describe("Better Auth secret key"),
  BETTER_AUTH_URL: z.string().default("http://localhost:8000"),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.preprocess((val) => val === "" ? undefined : val, z.enum(["test_mode", "live_mode"]).optional()),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
  DODO_PAYMENTS_MONTHLY_PRODUCT_ID: z.string().optional(),
  DODO_PAYMENTS_ANNUAL_PRODUCT_ID: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
