import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import { processWebhook } from "corsair";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { corsair, processOAuthCallback } from "@repo/services/corsair";
import { auth } from "@repo/auth";

import { env } from "./env";
import { emitCorsairWebhookEvent, subscribeToCorsairEvents } from "./sse";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Ultrahuman OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function sanitizeHeaders(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((header) => {
    if (!isRecord(header)) return [];
    const name = getString(header.name);
    const headerValue = getString(header.value);
    return name || headerValue ? [{ name, value: headerValue }] : [];
  });
}

function sanitizeGmailMessage(value: unknown) {
  if (!isRecord(value)) return {};

  const payload = isRecord(value.payload) ? value.payload : undefined;
  const headers = sanitizeHeaders(payload?.headers);

  return {
    id: getString(value.id),
    threadId: getString(value.threadId),
    labelIds: getStringArray(value.labelIds),
    snippet: getString(value.snippet),
    historyId: getString(value.historyId),
    internalDate: getString(value.internalDate),
    payload: headers ? { headers } : undefined,
  };
}

function sanitizeGmailWebhookData(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    type: getString(value.type),
    emailAddress: getString(value.emailAddress),
    historyId: getString(value.historyId),
    labelsAdded: getStringArray(value.labelsAdded),
    labelsRemoved: getStringArray(value.labelsRemoved),
    message: sanitizeGmailMessage(value.message),
  };
}

function sanitizeCalendarDateTime(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    date: getString(value.date),
    dateTime: getString(value.dateTime),
    timeZone: getString(value.timeZone),
  };
}

function sanitizeCalendarAttendees(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((attendee) => {
    if (!isRecord(attendee)) return [];
    const email = getString(attendee.email);
    if (!email) return [];

    return [
      {
        email,
        displayName: getString(attendee.displayName),
        organizer: typeof attendee.organizer === "boolean" ? attendee.organizer : undefined,
        self: typeof attendee.self === "boolean" ? attendee.self : undefined,
        responseStatus: getString(attendee.responseStatus),
      },
    ];
  });
}

function sanitizeCalendarOrganizer(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    email: getString(value.email),
    displayName: getString(value.displayName),
    self: typeof value.self === "boolean" ? value.self : undefined,
  };
}

function sanitizeCalendarEvent(value: unknown) {
  if (!isRecord(value)) return {};

  return {
    id: getString(value.id),
    status: getString(value.status),
    htmlLink: getString(value.htmlLink),
    summary: getString(value.summary),
    description: getString(value.description),
    location: getString(value.location),
    colorId: getString(value.colorId),
    organizer: sanitizeCalendarOrganizer(value.organizer),
    start: sanitizeCalendarDateTime(value.start),
    end: sanitizeCalendarDateTime(value.end),
    attendees: sanitizeCalendarAttendees(value.attendees),
    hangoutLink: getString(value.hangoutLink),
  };
}

function sanitizeCalendarWebhookData(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    type: getString(value.type),
    calendarId: getString(value.calendarId),
    eventId: getString(value.eventId),
    timestamp: getString(value.timestamp),
    event: sanitizeCalendarEvent(value.event),
  };
}

function sanitizeCorsairWebhookPayload(plugin: string | null, response: unknown) {
  if (!isRecord(response)) return undefined;

  const data =
    plugin === "gmail"
      ? sanitizeGmailWebhookData(response.data)
      : plugin === "googlecalendar" || plugin === "calendar"
        ? sanitizeCalendarWebhookData(response.data)
        : undefined;

  return {
    success: response.success === true,
    corsairEntityId: getString(response.corsairEntityId),
    data,
  };
}

app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
);

// ─── Better Auth: Mount BEFORE express.json() ──────────────────────────────
// Better Auth needs raw body access — express.json() must come after
app.all("/api/auth/{*splat}", toNodeHandler(auth));

// ─── Corsair: Webhook handler (Gmail & Calendar real-time push) ───────────────
// Single endpoint — Corsair auto-routes to the correct plugin handler
app.post("/webhooks/corsair", express.raw({ type: "*/*" }), async (req, res) => {
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

app.use(express.json());

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

app.get("/health", (req, res) => {
  return res.json({ message: "Ultrahuman server is healthy", healthy: true });
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
