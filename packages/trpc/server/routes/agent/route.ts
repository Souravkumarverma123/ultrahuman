import { z } from "../../schema";
import { router, tenantProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { chatMessageRepository } from "@repo/services/chat";
import { agentOrchestratorService } from "@repo/services/agent";

const TAGS = ["Agent"];
const getPath = generatePath("/agent");

export const agentRouter = router({
  // Fetch user's chat history
  getHistory: tenantProcedure
    .meta({ openapi: { method: "GET", path: getPath("/history"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
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
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Auto-prune old messages
      await chatMessageRepository.pruneOldMessages(userId, oneWeekAgo);

      // Fetch history
      const history = await chatMessageRepository.findByUserId(userId);

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

  // Clear user's chat history
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
        message: z.string(),
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
        message: input.message,
        model: input.model,
        userEmail,
        userName,
      });
    }),
});
