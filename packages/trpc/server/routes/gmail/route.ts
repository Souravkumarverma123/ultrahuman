import { z } from "../../schema";
import { corsair } from "@repo/services/corsair";
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

// ─── Router ──────────────────────────────────────────────────────────────────

export const gmailRouter = router({
  // Get the OAuth connect URL for Gmail
  getAuthUrl: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/auth-url"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const authUrl = await corsair.getAuthUrl("gmail", { tenantId: input.tenantId });
      return { url: authUrl };
    }),

  // Check if Gmail is connected for a tenant
  getConnectionStatus: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/connection-status"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ connected: z.boolean(), email: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        const client = corsair.withTenant(input.tenantId);
        const account = await client.gmail.api.users.getProfile({});
        return { connected: true, email: account?.emailAddress ?? undefined };
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
      const result = await client.gmail.api.users.threads.list({
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
      const thread = await client.gmail.api.users.threads.get({
        id: input.threadId,
      });

      return {
        id: String(thread?.id ?? input.threadId),
        subject: String(thread?.subject ?? "(no subject)"),
        snippet: String(thread?.snippet ?? ""),
        from: (thread?.from as { email: string; name?: string }) ?? { email: "" },
        messageCount: Number(thread?.messageCount ?? 0),
        isRead: Boolean(thread?.isRead ?? false),
        isStarred: Boolean(thread?.isStarred ?? false),
        lastMessageAt: String(thread?.lastMessageAt ?? new Date().toISOString()),
        labels: (thread?.labels as string[]) ?? [],
        messages: (thread?.messages as typeof emailMessageSchema._type[]) ?? [],
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
      const result = await client.gmail.api.users.threads.list({
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
      const result = await client.gmail.api.users.messages.send({
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        replyToMessageId: input.replyToMessageId,
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
      const result = await client.gmail.api.users.drafts.create({
        to: input.to,
        subject: input.subject,
        body: input.body,
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
      await client.gmail.api.users.threads.modify({
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
      await client.gmail.api.users.threads.modify({
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
      await client.gmail.api.users.threads.modify({
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
      await client.gmail.api.users.threads.trash({
        id: input.threadId,
      });
      return { success: true };
    }),
});
