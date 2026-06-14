import { Pool } from "pg";
import { createCorsair, setupCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
if (!process.env.CORSAIR_KEK) {
  throw new Error("CORSAIR_KEK is not set — generate one with: openssl rand -hex 32");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: pool,
  kek: process.env.CORSAIR_KEK,
  multiTenancy: true,
});

export type CorsairInstance = typeof corsair;

export { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";

// Automatically setup Corsair integrations with credentials from environment variables
const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  setupCorsair(corsair, {
    credentials: {
      gmail: {
        client_id: googleClientId,
        client_secret: googleClientSecret,
      },
      googlecalendar: {
        client_id: googleClientId,
        client_secret: googleClientSecret,
      },
    },
  }).catch((err) => {
    console.error("Failed to setup Corsair integrations:", err);
  });
} else {
  console.warn(
    "Google OAuth credentials are not set in environment. Gmail and Google Calendar connections will be unavailable.",
  );
}
