import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "@repo/logger";

export type CorsairRealtimeEvent = {
  id: string;
  type: "corsair.webhook";
  plugin: string | null;
  action: string | null;
  receivedAt: string;
  payload?: unknown;
};

type SseClient = {
  id: string;
  tenantId: string;
  response: Response;
  heartbeat: NodeJS.Timeout;
};

const clientsByTenant = new Map<string, Set<SseClient>>();

function writeEvent(response: Response, event: string, data: unknown, id?: string) {
  if (id) {
    response.write(`id: ${id}\n`);
  }
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function removeClient(client: SseClient) {
  clearInterval(client.heartbeat);
  const clients = clientsByTenant.get(client.tenantId);
  clients?.delete(client);
  if (clients?.size === 0) {
    clientsByTenant.delete(client.tenantId);
  }
}

export function subscribeToCorsairEvents(tenantId: string, response: Response) {
  let clients = clientsByTenant.get(tenantId);
  if (clients && clients.size >= 10) {
    logger.warn(`[sse] connection rejected: tenant=${tenantId} exceeds max connections limit`);
    response.status(429).end("Too many active connections");
    return () => {};
  }

  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  const client: SseClient = {
    id: randomUUID(),
    tenantId,
    response,
    heartbeat: setInterval(() => {
      writeEvent(response, "heartbeat", { receivedAt: new Date().toISOString() });
    }, 25_000),
  };

  if (!clients) {
    clients = new Set();
    clientsByTenant.set(tenantId, clients);
  }
  clients.add(client);

  response.write("retry: 5000\n\n");
  writeEvent(response, "connected", {
    clientId: client.id,
    receivedAt: new Date().toISOString(),
  });

  logger.info(`[sse] connected client=${client.id} tenant=${tenantId}`);

  return () => {
    removeClient(client);
    logger.info(`[sse] disconnected client=${client.id} tenant=${tenantId}`);
  };
}

export function emitCorsairWebhookEvent(input: {
  tenantId?: string;
  plugin: string | null;
  action: string | null;
  payload?: unknown;
}) {
  if (!input.tenantId) {
    logger.warn("[sse] skipped Corsair realtime event without tenantId", {
      plugin: input.plugin,
      action: input.action,
    });
    return;
  }

  const clients = clientsByTenant.get(input.tenantId);
  if (!clients?.size) return;

  const event: CorsairRealtimeEvent = {
    id: randomUUID(),
    type: "corsair.webhook",
    plugin: input.plugin,
    action: input.action,
    receivedAt: new Date().toISOString(),
    payload: input.payload,
  };

  for (const client of clients) {
    try {
      writeEvent(client.response, "corsair", event, event.id);
    } catch (err) {
      logger.warn("[sse] failed to write realtime event", { err, clientId: client.id });
      removeClient(client);
    }
  }
}

// Periodically check and clean up sockets that are no longer writeable
setInterval(() => {
  for (const [tenantId, clients] of clientsByTenant.entries()) {
    for (const client of clients) {
      if (client.response.writableEnded || !client.response.writable) {
        logger.info(`[sse] cleaning up stale client=${client.id} tenant=${tenantId}`);
        removeClient(client);
      }
    }
  }
}, 60_000);
