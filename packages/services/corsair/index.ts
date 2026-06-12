import { Pool } from "pg";
import { createCorsair } from "corsair";
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
  plugins: [
    gmail(),
    googlecalendar(),
  ],
  database: pool,
  kek: process.env.CORSAIR_KEK,
  multiTenancy: true,
});

export type CorsairInstance = typeof corsair;
