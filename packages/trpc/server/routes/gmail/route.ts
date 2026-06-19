import { z } from "../../schema";
import { corsair } from "@repo/services/corsair";
import { router, tenantProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { BaseCorsairRouter } from "../../factories/corsair-router.factory";
import { TRPCError } from "@trpc/server";
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

class GmailRouterFactory extends BaseCorsairRouter<any> {
  protected pluginName = "gmail" as const;
  protected getPath = getPath;
  protected tags = TAGS;
}

// ─── MIME / EML builder ──────────────────────────────────────────────────────
// Produces a fully RFC 2822-compliant MIME message (.eml format).
// Gmail's `messages.send` and `drafts.create` raw field require exactly this.
function buildMimeMessage(opts: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  replyToMessageId?: string;
}): string {
  const date = new Date().toUTCString(); // RFC 2822 date
  const lines: string[] = [
    `Date: ${date}`,
    `To: ${opts.to.join(", ")}`,
  ];
  if (opts.cc && opts.cc.length > 0) lines.push(`Cc: ${opts.cc.join(", ")}`);
  if (opts.bcc && opts.bcc.length > 0) lines.push(`Bcc: ${opts.bcc.join(", ")}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.replyToMessageId) {
    lines.push(`In-Reply-To: ${opts.replyToMessageId}`);
    lines.push(`References: ${opts.replyToMessageId}`);
  }
  // Standard MIME headers — use text/html when body contains HTML markup
  lines.push(`MIME-Version: 1.0`);
  if (opts.isHtml) {
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
  } else {
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
  }
  lines.push(`Content-Transfer-Encoding: 7bit`);
  // Blank line separates headers from body (RFC 2822 §2.1)
  lines.push(``);
  lines.push(opts.body);
  return lines.join("\r\n");
}

const factory = new GmailRouterFactory();

export const gmailRouter = router({
  getAuthUrl: factory.createAuthUrlProcedure(),
  getConnectionStatus: factory.createConnectionStatusProcedure(),

  // List email threads
  listThreads: tenantProcedure
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
  getThread: tenantProcedure
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
  searchEmails: tenantProcedure
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
  sendEmail: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/send"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        to: z.array(z.string()),
        cc: z.array(z.string()).optional(),
        bcc: z.array(z.string()).optional(),
        subject: z.string(),
        body: z.string(),
        isHtml: z.boolean().optional(), // true when body contains HTML markup
        replyToMessageId: z.string().optional(),
        replyToThreadId: z.string().optional(),
      }),
    )
    .output(z.object({ messageId: z.string(), success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);

      // Build a fully RFC 2822-compliant MIME (.eml) message
      const mimeMessage = buildMimeMessage({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        isHtml: input.isHtml,
        replyToMessageId: input.replyToMessageId,
      });
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
  createDraft: tenantProcedure
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

      // Build a fully RFC 2822-compliant MIME (.eml) message
      const mimeMessage = buildMimeMessage({
        to: input.to,
        subject: input.subject,
        body: input.body,
      });

      const result = await client.gmail.api.drafts.create({
        draft: {
          message: {
            raw: Buffer.from(mimeMessage).toString("base64url"),
          },
        },
      });

      return {
        draftId: String(result?.id ?? ""),
        success: true,
      };
    }),

  // Archive a thread (remove from INBOX)
  archiveThread: tenantProcedure
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
  markAsRead: tenantProcedure
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
  starThread: tenantProcedure
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
  trashThread: tenantProcedure
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

  // Restore a thread from Trash back to Inbox
  untrashThread: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/untrash"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.gmail.api.threads.untrash({
        id: input.threadId,
      });
      return { success: true };
    }),

  // Permanently delete a thread (irreversible — bypasses Trash)
  deleteThreadPermanently: tenantProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/threads/:threadId"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      try {
        await client.gmail.api.threads.delete({
          id: input.threadId,
        });
        return { success: true };
      } catch (error: any) {
        console.error("Failed to permanently delete thread:", error);
        
        // Throw a specific error explaining the OAuth scope requirement
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Permanent deletion requires the full 'https://mail.google.com/' scope. Please verify that this scope is enabled on your Google Cloud Console OAuth consent screen and re-connect your integration.",
        });
      }
    }),
});

