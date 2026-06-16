import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "./schema";
import { sql } from "drizzle-orm";

export const db = drizzle(env.DATABASE_URL, { schema });
export * from "drizzle-orm";
export * from "./schema";

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Run a simple query to verify database connection health
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (err) {
    console.error("Database connection health check failed:", err);
    return false;
  }
}

export default db;
