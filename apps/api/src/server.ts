import express from "express";
import { logger, correlationStorage } from "@repo/logger";
import cors from "cors";
import { processWebhook } from "corsair";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "crypto";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { corsair, processOAuthCallback } from "@repo/services/corsair";
import { auth } from "@repo/auth";
import { checkDatabaseConnection } from "@repo/database";

import { env } from "./env";
import { emitCorsairWebhookEvent, subscribeToCorsairEvents } from "./sse";
import { sanitizeCorsairWebhookPayload } from "@repo/utils/sanitizers";

export const app = express();

// ─── Production Hardening Middlewares ──────────────────────────────────────────

// 1. Correlation ID middleware (runs Request context inside AsyncLocalStorage)
app.use((req, res, next) => {
  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  correlationStorage.run(correlationId, () => {
    next();
  });
});

// 2. Security Headers (Helmet-equivalent)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
  );
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

// 3. Request validation: Enforce application/json for REST/tRPC payloads
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    // Exclude webhooks as they are raw payloads routed from external sources
    if (req.path.startsWith("/webhooks/")) {
      return next();
    }
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      return res.status(415).json({
        error: "Unsupported Media Type. Content-Type must be application/json",
      });
    }
  }
  next();
});

// ─── OpenAPI & Rate Limiters ───────────────────────────────────────────────────

const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Ultrahuman OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication requests, please try again later." },
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many webhook requests." },
});

app.use("/api/auth", authLimiter);
app.use("/webhooks", webhookLimiter);

app.use(
  cors({
    origin: [env.WEB_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    credentials: true,
  }),
);

// ─── Better Auth: Mount BEFORE express.json() ──────────────────────────────
// Better Auth needs raw body access — express.json() must come after
app.all("/api/auth/*any", toNodeHandler(auth));

// ─── Corsair: Webhook handler (Gmail & Calendar real-time push) ───────────────
// Single endpoint — Corsair auto-routes to the correct plugin handler
// Enforce body size limit of 2mb on raw webhooks
app.post("/webhooks/corsair", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
  try {
    const tenantId = req.query["tenantId"] as string | undefined;
    const result = await processWebhook(
      corsair,
      Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v ?? "")])),
      Buffer.isBuffer(req.body)
        ? req.body.toString("utf-8")
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? {}),
      { tenantId },
    );

    if (result.plugin) {
      logger.info(`[webhook] ${result.plugin}.${result.action} for tenant=${tenantId}`);
      emitCorsairWebhookEvent({
        tenantId,
        plugin: result.plugin,
        action: result.action,
        payload: sanitizeCorsairWebhookPayload(result.plugin, result.response),
      });
    }

    return res.status(200).json(result.response ?? { ok: true });
  } catch (err) {
    logger.error("[webhook] Error processing Corsair webhook", { err });
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Enforce standard JSON body size limit of 5mb
app.use(express.json({ limit: "5mb" }));

// ─── Realtime: Authenticated SSE stream for Corsair webhook updates ───────────
app.get("/events/corsair", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const cleanup = subscribeToCorsairEvents(session.user.id, res);
  req.on("close", cleanup);
});

app.get("/", (req, res) => {
  return res.json({ message: "Ultrahuman is up and running..." });
});

// Deep health check with DB connectivity ping
app.get("/health", async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  if (dbHealthy) {
    return res.json({
      status: "UP",
      timestamp: new Date().toISOString(),
      services: { database: "UP" },
    });
  } else {
    return res.status(503).json({
      status: "DOWN",
      timestamp: new Date().toISOString(),
      services: { database: "DOWN" },
    });
  }
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

// ─── Corsair: OAuth callback (Gmail & Calendar connect flow) ──────────────────
app.get("/corsair/callback", async (req, res) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const redirectUri = `${env.BASE_URL}/corsair/callback`;
    const result = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    });

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
