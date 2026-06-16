import "dotenv/config";
import { serverRouter } from "./server/index";

async function main() {
  const caller = serverRouter.createCaller({
    req: {} as any,
    res: {} as any,
    session: {
      user: {
        id: "xkxqBril7PlmluGoFt04oValxl6qYcZZ",
        email: "souravkumarverma56@gmail.com",
        name: "Sourav Kumar",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "session-id",
        userId: "xkxqBril7PlmluGoFt04oValxl6qYcZZ",
        token: "session-token",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        userAgent: "test",
        ipAddress: "127.0.0.1",
      }
    }
  });

  const legitimateMessage = "Check if I have any unread emails about 'test' in my Gmail and list them.";

  console.log("Sending message to agent:", legitimateMessage);
  const result = await caller.agent.chat({
    tenantId: "xkxqBril7PlmluGoFt04oValxl6qYcZZ",
    message: legitimateMessage,
    model: "gpt-4o-mini",
  });

  console.log("Agent Response:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
