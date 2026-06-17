import { z } from "zod";

const envSchema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
  DODO_PAYMENTS_API_KEY: z.string().optional(),
  DODO_PAYMENTS_ENVIRONMENT: z.preprocess((val) => val === "" ? undefined : val, z.enum(["test_mode", "live_mode"]).optional()),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
