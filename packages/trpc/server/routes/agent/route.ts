import { z } from "../../schema";
import { router, tenantProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { chatMessageRepository } from "@repo/services/chat";
import { agentOrchestratorService } from "@repo/services/agent";
import { memoryService } from "@repo/services/memory";

const TAGS = ["Agent"];
const getPath = generatePath("/agent");

export const agentRouter = router({
  // Get list of conversation threads for the user
  getThreads: tenantProcedure
    .meta({ openapi: { method: "GET", path: getPath("/threads"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(
      z.object({
        threads: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            updatedAt: z.date(),
            messageCount: z.number(),
          }),
        ),
      }),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const threads = await chatMessageRepository.getThreadsForUser(userId);
      return { threads };
    }),

  // Delete a specific thread
  deleteThread: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/threads/delete"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await chatMessageRepository.deleteThread(userId, input.threadId);
      return { success: true };
    }),

  // Fetch user's chat history for a specific thread
  getHistory: tenantProcedure
    .meta({ openapi: { method: "GET", path: getPath("/history"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), threadId: z.string().optional() }))
    .output(
      z.object({
        messages: z.array(
          z.object({
            id: z.string(),
            role: z.enum(["user", "assistant"]),
            content: z.string(),
            toolsUsed: z.array(z.string()).optional(),
            createdAt: z.date(),
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Auto-prune old messages
      await chatMessageRepository.pruneOldMessages(userId, oneWeekAgo);

      // Fetch history for specified thread
      const history = await chatMessageRepository.findByUserIdAndThread(userId, input.threadId);

      return {
        messages: history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolsUsed: m.toolsUsed ?? undefined,
          createdAt: m.createdAt ?? new Date(),
        })),
      };
    }),

  // Clear user's chat history across threads
  clearHistory: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/clear-history"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      await chatMessageRepository.deleteByUserId(userId);
      return { success: true };
    }),

  // Update a message's content after email action (sent/drafted)
  updateMessage: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update-message"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        messageId: z.string(),
        action: z.enum(["sent", "drafted"]),
        to: z.string(),
        subject: z.string(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      // Fetch the message, replace draft block with action marker, and update
      const history = await chatMessageRepository.findByUserId(userId);
      const message = history.find((m) => m.id === input.messageId);
      if (!message) return { success: false };

      const marker =
        input.action === "sent"
          ? `%%EMAIL_SENT%%${JSON.stringify({ to: input.to, subject: input.subject })}%%END_SENT%%`
          : `%%EMAIL_DRAFTED%%${JSON.stringify({ to: input.to, subject: input.subject })}%%END_DRAFTED%%`;

      const newContent = message.content.replace(/%%EMAIL_DRAFT%%[\s\S]*?%%END_DRAFT%%/, marker);
      await chatMessageRepository.updateContent(input.messageId, userId, newContent);
      return { success: true };
    }),

  // AI chat completion
  chat: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/chat"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        threadId: z.string().optional(),
        message: z.string().max(10_000),
        model: z.string().optional(),
      }),
    )
    .output(
      z.object({
        reply: z.string(),
        toolsUsed: z.array(z.string()),
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userEmail = ctx.session.user.email ?? "";
      const userName = ctx.session.user.name ?? "";
      return await agentOrchestratorService.chat({
        userId,
        threadId: input.threadId,
        message: input.message,
        model: input.model,
        userEmail,
        userName,
      });
    }),

  // ─── Long-Term Memory Management ────────────────────────────────────────────

  // Get all stored memories for the authenticated user
  getMemories: tenantProcedure
    .meta({ openapi: { method: "GET", path: getPath("/memories"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(
      z.object({
        memories: z.array(
          z.object({
            id: z.string(),
            memory: z.string(),
            score: z.number().optional(),
            categories: z.array(z.string()).optional(),
            createdAt: z.string().optional(),
          }),
        ),
      }),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const allMemories = await memoryService.getAllMemories({ userId });
      return {
        memories: allMemories.map((m) => ({
          id: m.id,
          memory: m.memory,
          score: m.score,
          categories: m.categories,
          createdAt: m.createdAt,
        })),
      };
    }),

  // Delete a specific memory by ID
  deleteMemory: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/memories/delete"), tags: TAGS } })
    .input(z.object({ tenantId: z.string(), memoryId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await memoryService.deleteMemory({ userId }, input.memoryId);
      return { success: true };
    }),

  // Delete all memories for the authenticated user
  deleteAllMemories: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/memories/delete-all"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      await memoryService.deleteAllMemories({ userId });
      return { success: true };
    }),
});

