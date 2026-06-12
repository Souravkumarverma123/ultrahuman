import { z } from "../../schema";
import { corsair, generateOAuthUrl } from "@repo/services/corsair";
import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

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
      name: match[1]?.replace(/^["']|["']$/g, '').trim() || undefined,
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

function getBody(part?: any): string {
  if (!part) return "";
  if (part.body?.data) {
    try {
      return Buffer.from(part.body.data, "base64url").toString("utf-8");
    } catch {
      return "";
    }
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      const body = getBody(subPart);
      if (body) return body;
    }
  }
  return "";
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
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  labels: string[];
}

function parseMessage(msg: any): ParsedMessage {
  const headers = (msg.payload?.headers as { name?: string; value?: string }[]) ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  return {
    id: String(msg.id ?? ""),
    threadId: String(msg.threadId ?? ""),
    from: parseEmailAddress(getHeader("from")),
    to: parseEmailAddresses(getHeader("to")),
    cc: getHeader("cc") ? parseEmailAddresses(getHeader("cc")) : undefined,
    subject: getHeader("subject") ?? "(no subject)",
    snippet: String(msg.snippet ?? ""),
    body: getBody(msg.payload) || msg.snippet || "",
    isRead: !(msg.labelIds ?? []).includes("UNREAD"),
    isStarred: (msg.labelIds ?? []).includes("STARRED"),
    receivedAt: msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : new Date().toISOString(),
    labels: (msg.labelIds as string[]) ?? [],
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const gmailRouter = router({
  // Get the OAuth connect URL for Gmail
  getAuthUrl: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/auth-url"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const baseUrl = process.env.BASE_URL || "http://localhost:8000";
      const redirectUri = `${baseUrl}/corsair/callback`;
      const { url } = await generateOAuthUrl(corsair, "gmail", {
        tenantId: input.tenantId,
        redirectUri,
      });
      return { url };
    }),

  // Check if Gmail is connected for a tenant
  getConnectionStatus: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/connection-status"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ connected: z.boolean(), email: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const status = await corsair.manage.connectionStatus.get({ tenantId: input.tenantId });
        const connected = status.gmail === "connected";
        return { connected, email: connected ? `${input.tenantId}@gmail.com` : undefined };
      } catch {
        return { connected: false };
      }
    }),

  // List email threads
  listThreads: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/threads"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        labelIds: z.array(z.string()).optional().default(["INBOX"]),
        maxResults: z.number().optional().default(25),
        pageToken: z.string().optional(),
        q: z.string().optional(), // Gmail search query
      })
    )
    .output(
      z.object({
        threads: z.array(threadSchema),
        nextPageToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      const result = await client.gmail.api.threads.list({
        labelIds: input.labelIds,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        q: input.q,
      });

      const threads = (result?.threads ?? []).map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        subject: String(t.subject ?? "(no subject)"),
        snippet: String(t.snippet ?? ""),
        from: (t.from as { email: string; name?: string }) ?? { email: "" },
        messageCount: Number(t.messageCount ?? 1),
        isRead: Boolean(t.isRead ?? false),
        isStarred: Boolean(t.isStarred ?? false),
        lastMessageAt: String(t.lastMessageAt ?? new Date().toISOString()),
        labels: (t.labels as string[]) ?? [],
      }));

      return {
        threads,
        nextPageToken: result?.nextPageToken ?? undefined,
      };
    }),

  // Get a single full thread with all messages
  getThread: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/threads/:threadId"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(threadSchema)
    .query(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
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
  searchEmails: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/search"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        query: z.string(),
        maxResults: z.number().optional().default(25),
      })
    )
    .output(z.object({ threads: z.array(threadSchema) }))
    .query(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      const result = await client.gmail.api.threads.list({
        q: input.query,
        maxResults: input.maxResults,
      });

      const threads = (result?.threads ?? []).map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        subject: String(t.subject ?? "(no subject)"),
        snippet: String(t.snippet ?? ""),
        from: (t.from as { email: string; name?: string }) ?? { email: "" },
        messageCount: Number(t.messageCount ?? 1),
        isRead: Boolean(t.isRead ?? false),
        isStarred: Boolean(t.isStarred ?? false),
        lastMessageAt: String(t.lastMessageAt ?? new Date().toISOString()),
        labels: (t.labels as string[]) ?? [],
      }));

      return { threads };
    }),

  // Send a new email
  sendEmail: publicProcedure
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
      })
    )
    .output(z.object({ messageId: z.string(), success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
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
  createDraft: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/drafts"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        to: z.array(z.string()),
        subject: z.string(),
        body: z.string(),
      })
    )
    .output(z.object({ draftId: z.string(), success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      const result = await client.gmail.api.drafts.create({
        draft: {
          message: {
            raw: Buffer.from(
              `To: ${input.to.join(", ")}\r\nSubject: ${input.subject}\r\n\r\n${input.body}`
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
  archiveThread: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/archive"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        removeLabelIds: ["INBOX"],
      });
      return { success: true };
    }),

  // Mark a thread as read
  markAsRead: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/read"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        removeLabelIds: ["UNREAD"],
      });
      return { success: true };
    }),

  // Star / unstar a thread
  starThread: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/star"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        threadId: z.string(),
        starred: z.boolean(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      await client.gmail.api.threads.modify({
        id: input.threadId,
        addLabelIds: input.starred ? ["STARRED"] : [],
        removeLabelIds: input.starred ? [] : ["STARRED"],
      });
      return { success: true };
    }),

  // Trash a thread
  trashThread: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/:threadId/trash"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const client = corsair.withTenant(input.tenantId);
      await client.gmail.api.threads.trash({
        id: input.threadId,
      });
      return { success: true };
    }),
});
