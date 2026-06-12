import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import { processWebhook } from "corsair";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { corsair } from "@repo/services/corsair";

import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Ultrahuman OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

if (env.NODE_ENV !== "prod") {
  app.use(
    cors({
      origin: "http://localhost:3000",
    }),
  );
}

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ message: "Ultrahuman is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Ultrahuman server is healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

// ─── Corsair: Webhook handler (Gmail & Calendar real-time push) ───────────────
// Single endpoint — Corsair auto-routes to the correct plugin handler
app.post(
  "/webhooks/corsair",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      const tenantId = req.query["tenantId"] as string | undefined;
      const result = await processWebhook(
        corsair,
        Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, String(v ?? "")])
        ),
        req.body as Buffer,
        { tenantId },
      );

      if (result.plugin) {
        logger.info(`[webhook] ${result.plugin}.${result.action} for tenant=${tenantId}`);
      }

      return res.status(200).json(result.response ?? { ok: true });
    } catch (err) {
      logger.error("[webhook] Error processing Corsair webhook", { err });
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

// ─── Corsair: OAuth callback (Gmail & Calendar connect flow) ──────────────────
app.get("/corsair/callback", async (req, res) => {
  try {
    const params = Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, String(v ?? "")])
    );
    const result = await (corsair as unknown as {
      handleOAuthCallback: (p: Record<string, string>) => Promise<{ plugin?: string }>;
    }).handleOAuthCallback(params);

    const plugin = result?.plugin ?? "unknown";
    logger.info(`[oauth] Connected plugin: ${plugin}`);
    return res.redirect(`${env.WEB_URL}/settings?connected=${plugin}`);
  } catch (err) {
    logger.error("[oauth] OAuth callback error", { err });
    return res.redirect(`${env.WEB_URL}/settings?error=oauth_failed`);
  }
});

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
