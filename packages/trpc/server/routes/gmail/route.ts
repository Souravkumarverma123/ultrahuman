import { z } from "../../schema";
import { corsair, generateOAuthUrl } from "@repo/services/corsair";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import type {} from "express-serve-static-core";

const TAGS = ["Gmail"];
const getPath = generatePath("/gmail");

// ─── Output schemas ──────────────────────────────────────────────────────────

const emailAddressSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
});

const emailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: emailAddressSchema,
  to: z.array(emailAddressSchema),
  cc: z.array(emailAddressSchema).optional(),
  subject: z.string(),
  snippet: z.string(),
  body: z.string(),
  isHtml: z.boolean().optional(),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  receivedAt: z.string(),
  labels: z.array(z.string()),
});

const threadSchema = z.object({
  id: z.string(),
  subject: z.string(),
  snippet: z.string(),
  from: emailAddressSchema,
  messageCount: z.number(),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  lastMessageAt: z.string(),
  labels: z.array(z.string()),
  messages: z.array(emailMessageSchema).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEmailAddress(headerVal?: string): { email: string; name?: string } {
  if (!headerVal) return { email: "" };
  const match = headerVal.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return {
      name: match[1]?.replace(/^["']|["']$/g, "").trim() || undefined,
      email: match[2]?.trim() || "",
    };
  }
  return { email: headerVal.trim() };
}

function parseEmailAddresses(headerVal?: string): { email: string; name?: string }[] {
  if (!headerVal) return [];
  // Split by commas, but ignore commas inside quotes
  const addresses = headerVal.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return addresses.map((addr) => parseEmailAddress(addr));
}

function extractBody(part?: any): { html?: string; text?: string } {
  if (!part) return {};

  const bodyData = part.body?.data;
  let decoded = "";
  if (bodyData) {
    try {
      decoded = Buffer.from(bodyData, "base64url").toString("utf-8");
    } catch {}
  }

  const mimeType = part.mimeType?.toLowerCase();

  if (mimeType === "text/html" && decoded) {
    return { html: decoded };
  }
  if (mimeType === "text/plain" && decoded) {
    return { text: decoded };
  }

  let html: string | undefined;
  let text: string | undefined;

  if (part.parts) {
    for (const subPart of part.parts) {
      const res = extractBody(subPart);
      if (res.html) html = res.html;
      if (res.text) text = res.text;
    }
  }

  return { html, text };
}

function getBody(part?: any): string {
  const { html, text } = extractBody(part);
  return html || text || "";
}

interface ParsedMessage {
  id: string;
  threadId: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc?: { email: string; name?: string }[];
  subject: string;
  snippet: string;
  body: string;
  isHtml?: boolean;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  labels: string[];
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseMessage(msg: any): ParsedMessage {
  const headers = (msg.payload?.headers as { name?: string; value?: string }[]) ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const { html, text } = extractBody(msg.payload);
  const body = html || text || msg.snippet || "";
  const isHtml = !!html;

  return {
    id: String(msg.id ?? ""),
    threadId: String(msg.threadId ?? ""),
    from: parseEmailAddress(getHeader("from")),
    to: parseEmailAddresses(getHeader("to")),
    cc: getHeader("cc") ? parseEmailAddresses(getHeader("cc")) : undefined,
    subject: decodeHtmlEntities(getHeader("subject") ?? "(no subject)"),
    snippet: decodeHtmlEntities(String(msg.snippet ?? "")),
    body,
    isHtml,
    isRead: !(msg.labelIds ?? []).includes("UNREAD"),
    isStarred: (msg.labelIds ?? []).includes("STARRED"),
    receivedAt: msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : new Date().toISOString(),
    labels: (msg.labelIds as string[]) ?? [],
  };
}

async function fetchAndParseThreads(client: any, rawThreads: any[]): Promise<any[]> {
  return Promise.all(
    rawThreads.map(async (t) => {
      try {
        const threadDetails = await client.gmail.api.threads.get({
          id: t.id,
        });
        const parsedMessages: ParsedMessage[] = (threadDetails?.messages ?? []).map(parseMessage);
        const firstMessage = parsedMessages[0];
        const lastMessage = parsedMessages[parsedMessages.length - 1];

        return {
          id: String(t.id),
          subject: String(firstMessage?.subject ?? "(no subject)"),
          snippet: String(threadDetails?.snippet ?? t.snippet ?? firstMessage?.snippet ?? ""),
          from: firstMessage?.from ?? { email: "" },
          messageCount: parsedMessages.length,
          isRead: parsedMessages.every((m) => m.isRead),
          isStarred: parsedMessages.some((m) => m.isStarred),
          lastMessageAt: lastMessage?.receivedAt ?? new Date().toISOString(),
          labels: Array.from(new Set(parsedMessages.flatMap((m) => m.labels))),
        };
      } catch (err) {
        console.error(`Failed to fetch thread details for ${t.id}:`, err);
        return {
          id: String(t.id),
          subject: "(no subject)",
          snippet: String(t.snippet ?? ""),
          from: { email: "" },
          messageCount: 1,
          isRead: false,
          isStarred: false,
          lastMessageAt: new Date().toISOString(),
          labels: [],
        };
      }
    }),
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const gmailRouter = router({
  // Get the OAuth connect URL for Gmail
  getAuthUrl: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/auth-url"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ url: z.string() }))
    .query(async ({ ctx }) => {
      const tenantId = ctx.session.user.id;
      const baseUrl = process.env.BASE_URL || "http://localhost:8000";
      const redirectUri = `${baseUrl}/corsair/callback`;
      const { url } = await generateOAuthUrl(corsair, "gmail", {
        tenantId,
        redirectUri,
      });
      return { url };
    }),

  // Check if Gmail is connected for a tenant
  getConnectionStatus: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/connection-status"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ connected: z.boolean(), email: z.string().optional() }))
    .query(async ({ ctx }) => {
      try {
        const status = await corsair.manage.connectionStatus.get({ tenantId: ctx.session.user.id });
        const connected = status.gmail === "connected";
        return { connected };
      } catch {
        return { connected: false };
      }
    }),

  // List email threads
  listThreads: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/threads"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        labelIds: z.array(z.string()).optional().default(["INBOX"]),
        maxResults: z.number().optional().default(25),
        pageToken: z.string().optional(),
        q: z.string().optional(), // Gmail search query
      }),
    )
    .output(
      z.object({
        threads: z.array(threadSchema),
        nextPageToken: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const result = await client.gmail.api.threads.list({
        labelIds: input.labelIds,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        q: input.q,
      });

      const threads = await fetchAndParseThreads(client, result?.threads ?? []);

      return {
        threads,
        nextPageToken: result?.nextPageToken ?? undefined,
      };
    }),

  // Get a single full thread with all messages
  getThread: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/threads/:threadId"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(threadSchema)
    .query(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const thread = await client.gmail.api.threads.get({
        id: input.threadId,
      });

      const parsedMessages: ParsedMessage[] = (thread?.messages ?? []).map(parseMessage);
      const firstMessage = parsedMessages[0];
      const lastMessage = parsedMessages[parsedMessages.length - 1];

      return {
        id: String(thread?.id ?? input.threadId),
        subject: String(firstMessage?.subject ?? "(no subject)"),
        snippet: String(thread?.snippet ?? firstMessage?.snippet ?? ""),
        from: firstMessage?.from ?? { email: "" },
        messageCount: parsedMessages.length,
        isRead: parsedMessages.every((m) => m.isRead),
        isStarred: parsedMessages.some((m) => m.isStarred),
        lastMessageAt: lastMessage?.receivedAt ?? new Date().toISOString(),
        labels: Array.from(new Set(parsedMessages.flatMap((m) => m.labels))),
        messages: parsedMessages,
      };
    }),

  // Advanced Gmail search
  searchEmails: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/search"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        query: z.string(),
        maxResults: z.number().optional().default(25),
      }),
    )
    .output(z.object({ threads: z.array(threadSchema) }))
    .query(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const result = await client.gmail.api.threads.list({
        q: input.query,
        maxResults: input.maxResults,
      });

      const threads = await fetchAndParseThreads(client, result?.threads ?? []);

      return { threads };
    }),

  // Send a new email
  sendEmail: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/send"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        to: z.array(z.string()),
        cc: z.array(z.string()).optional(),
        bcc: z.array(z.string()).optional(),
        subject: z.string(),
        body: z.string(),
        replyToMessageId: z.string().optional(),
        replyToThreadId: z.string().optional(),
      }),
    )
    .output(z.object({ messageId: z.string(), success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const headersList: string[] = [];
      headersList.push(`To: ${input.to.join(", ")}`);
      if (input.cc && input.cc.length > 0) {
        headersList.push(`Cc: ${input.cc.join(", ")}`);
      }
      if (input.bcc && input.bcc.length > 0) {
        headersList.push(`Bcc: ${input.bcc.join(", ")}`);
      }
      headersList.push(`Subject: ${input.subject}`);

      if (input.replyToMessageId) {
        headersList.push(`In-Reply-To: ${input.replyToMessageId}`);
        headersList.push(`References: ${input.replyToMessageId}`);
      }

      const mimeMessage = headersList.join("\r\n") + "\r\n\r\n" + input.body;
      const raw = Buffer.from(mimeMessage).toString("base64url");

      const result = await client.gmail.api.messages.send({
        raw,
        threadId: input.replyToThreadId,
      });

      return {
        messageId: String(result?.id ?? ""),
        success: true,
      };
    }),

  // Create a draft
  createDraft: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/drafts"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        to: z.array(z.string()),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .output(z.object({ draftId: z.string(), success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const result = await client.gmail.api.drafts.create({
        draft: {
          message: {
            raw: Buffer.from(
              `To: ${input.to.join(", ")}\r\nSubject: ${input.subject}\r\n\r\n${input.body}`,
            ).toString("base64url"),
          },
        },
      });

      return {
        draftId: String(result?.id ?? ""),
        success: true,
      };
    }),

  // Archive a thread (remove from INBOX)
  archiveThread: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/archive"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        removeLabelIds: ["INBOX"],
      });
      return { success: true };
    }),

  // Mark a thread as read
  markAsRead: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/read"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        removeLabelIds: ["UNREAD"],
      });
      return { success: true };
    }),

  // Star / unstar a thread
  starThread: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/star"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        threadId: z.string(),
        starred: z.boolean(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        addLabelIds: input.starred ? ["STARRED"] : [],
        removeLabelIds: input.starred ? [] : ["STARRED"],
      });
      return { success: true };
    }),

  // Trash a thread
  trashThread: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/trash"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.gmail.api.threads.trash({
        id: input.threadId,
      });
      return { success: true };
    }),
});
