import { db } from "./index";
import { corsairIntegrations } from "./models/corsair";

async function main() {
  const integrations = await db.select().from(corsairIntegrations);
  console.log("Integrations:", JSON.stringify(integrations, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
