import { db } from "./index";
import { user } from "./models/auth";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Updating testuser123@example.com to verified...");
  const result = await db.update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, "testuser123@example.com"))
    .returning();
  console.log("Update result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
