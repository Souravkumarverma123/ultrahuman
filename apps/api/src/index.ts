import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";
import { closeCorsairPool } from "@repo/services/corsair";

import { env } from "./env";

// Prevent async tool execution or other unhandled errors from crashing the API server
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection caught:", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception caught:", { error });
});

async function init() {
  try {
    const server = http.createServer(expressApplication);
    const PORT: number = env.PORT ? +env.PORT : 8000;
    server.listen(PORT, () => {
      logger.info(`http server is running on PORT ${PORT}`);
    });

    const shutdown = async () => {
      logger.info("Shutdown signal received. Closing server and database pools...");
      server.close(async () => {
        logger.info("HTTP server closed.");
        await closeCorsairPool();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
