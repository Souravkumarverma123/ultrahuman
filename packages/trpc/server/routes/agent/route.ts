import { z } from "../../schema";
import { corsair } from "@repo/services/corsair";
import { protectedProcedure, router, tenantProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import OpenAI from "openai";
import { buildCorsairToolDefs } from "@corsair-dev/mcp";
import ts from "typescript";
import type {} from "express-serve-static-core";
import type {} from "qs";
import { db, and, eq, lt, asc, sql, chatMessages, agentTokenUsage } from "@repo/database";
import crypto from "crypto";
import vm from "node:vm";

const TAGS = ["Agent"];
const getPath = generatePath("/agent");

if (!process.env.OPENAI_API_KEY) {
  console.warn("[agent] OPENAI_API_KEY not set — AI chat will be unavailable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });

const DEFAULT_AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";
const AGENT_DAILY_TOKEN_LIMIT = parsePositiveIntegerEnv("AGENT_DAILY_TOKEN_LIMIT", 20_000);
const AGENT_DAILY_REQUEST_LIMIT = parsePositiveIntegerEnv("AGENT_DAILY_REQUEST_LIMIT", 100);
const AGENT_MAX_INPUT_CHARS = parsePositiveIntegerEnv("AGENT_MAX_INPUT_CHARS", 2_000);
const AGENT_MAX_OUTPUT_TOKENS = parsePositiveIntegerEnv("AGENT_MAX_OUTPUT_TOKENS", 600);
const AGENT_HISTORY_MESSAGE_LIMIT = parsePositiveIntegerEnv("AGENT_HISTORY_MESSAGE_LIMIT", 8);
const AGENT_MAX_TOOL_ROUNDS = parsePositiveIntegerEnv("AGENT_MAX_TOOL_ROUNDS", 3);
const MAX_TOOL_RESULT_CHARS = parsePositiveIntegerEnv("AGENT_MAX_TOOL_RESULT_CHARS", 6_000);

const allowedModelNames = new Set([
  DEFAULT_AGENT_MODEL,
  "gpt-4o-mini",
  ...(process.env.AGENT_ALLOW_EXPENSIVE_MODELS === "true" ? ["gpt-4o"] : []),
]);

const blockedIntentPatterns: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(generate|create|make|draw|design|render)\s+(an?\s+)?(image|picture|photo|logo|icon|illustration|graphic|poster|banner)\b/i,
    reason: "image generation and design tasks are outside this assistant",
  },
  {
    pattern: /\b(image|photo|logo|icon|illustration|graphic)\s+(generation|generator|prompt|editing)\b/i,
    reason: "image generation and editing tasks are outside this assistant",
  },
  {
    pattern:
      /\b(generate|create|debug|fix|review|refactor|explain|build)\s+(code|a\s+script|program|function|component|api|sql|python|javascript|typescript|react|html|css)\b/i,
    reason: "code generation and programming help are outside this assistant",
  },
  {
    pattern:
      /\b(code|programming|algorithm|leetcode|stack trace|typescript|javascript|python|react|next\.js|node\.js|html|css)\b/i,
    reason: "code generation and programming help are outside this assistant",
  },
  {
    pattern: /\b(blog post|essay|poem|story|caption|landing page|homework|assignment)\b/i,
    reason: "general writing tasks are outside this assistant unless they are email/calendar work",
  },
];

const allowedIntentPatterns = [
  /\b(email|gmail|inbox|mail|message|thread|draft|reply|send|forward|archive|label|star|trash|unread|read|search|filter)\b/i,
  /\b(calendar|event|meeting|invite|schedule|reschedule|availability|free time|busy|google meet|meet link|attendee|appointment)\b/i,
  /\b(what can you do|help|capabilities|token usage|usage|limit|quota)\b/i,
];

const allowedToolNames = new Set(["list_operations", "get_schema", "run_script"]);

function parsePositiveIntegerEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeModel(model?: string) {
  return model && allowedModelNames.has(model) ? model : DEFAULT_AGENT_MODEL;
}

function getUsageDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getUsageId(userId: string, usageDate = getUsageDateKey()) {
  return `${userId}:${usageDate}`;
}

function estimateTokensFromText(text: string) {
  return Math.ceil(text.length / 4);
}

function messageText(message: OpenAI.Chat.ChatCompletionMessageParam) {
  const content = message.content;
  if (typeof content === "string") return content;
  if (!content) return "";
  return JSON.stringify(content);
}

function estimateMessagesTokens(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  return messages.reduce((total, message) => total + estimateTokensFromText(messageText(message)) + 8, 0);
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Tool result truncated to control assistant token usage.]`;
}

function evaluateAssistantScope(message: string) {
  const normalized = message.trim();

  for (const blocked of blockedIntentPatterns) {
    if (blocked.pattern.test(normalized)) {
      return {
        allowed: false,
        reason: blocked.reason,
      };
    }
  }

  if (allowedIntentPatterns.some((pattern) => pattern.test(normalized))) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      "this assistant is only available for Gmail, inbox, email drafting/sending, Google Calendar, scheduling, and meeting workflows",
  };
}

function isHelpRequest(message: string) {
  return /\b(what can you do|help|capabilities|what are you for)\b/i.test(message);
}

function isUsageRequest(message: string) {
  return /\b(token usage|usage|quota|limit|tokens left|remaining tokens)\b/i.test(message);
}

function buildScopeReply(reason: string) {
  return `I can only help with Ultrahuman email and calendar work: searching Gmail, summarizing threads, drafting or sending replies, checking calendar availability, creating invites, and managing meeting details. I can't help with ${reason}.`;
}

function buildHelpReply(summary: TokenUsageSummary) {
  return `I can help with Gmail and Google Calendar tasks inside Ultrahuman: search inbox threads, summarize email context, draft or send replies, check availability, create calendar events, add Google Meet links, and coordinate scheduling workflows.\n\nToday's AI usage: ${summary.totalTokens}/${summary.dailyTokenLimit} tokens used, ${summary.remainingTokens} remaining.`;
}

type TokenUsageSummary = {
  usageDate: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  remainingTokens: number;
  remainingRequests: number;
};

async function getTokenUsageSummary(userId: string): Promise<TokenUsageSummary> {
  const usageDate = getUsageDateKey();
  const [usage] = await db
    .select()
    .from(agentTokenUsage)
    .where(eq(agentTokenUsage.id, getUsageId(userId, usageDate)))
    .limit(1);

  const requestCount = usage?.requestCount ?? 0;
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? 0;

  return {
    usageDate,
    requestCount,
    promptTokens,
    completionTokens,
    totalTokens,
    dailyTokenLimit: AGENT_DAILY_TOKEN_LIMIT,
    dailyRequestLimit: AGENT_DAILY_REQUEST_LIMIT,
    remainingTokens: Math.max(0, AGENT_DAILY_TOKEN_LIMIT - totalTokens),
    remainingRequests: Math.max(0, AGENT_DAILY_REQUEST_LIMIT - requestCount),
  };
}

function hasBudgetForRequest(summary: TokenUsageSummary, estimatedTokens: number) {
  if (summary.remainingRequests <= 0) {
    return {
      allowed: false,
      reply: `You've reached today's assistant request limit (${summary.dailyRequestLimit}). Please try again tomorrow.`,
    };
  }

  if (summary.remainingTokens < estimatedTokens) {
    return {
      allowed: false,
      reply: `You've reached today's assistant token budget. Used ${summary.totalTokens}/${summary.dailyTokenLimit} tokens, with ${summary.remainingTokens} remaining. Please try again tomorrow or ask a shorter email/calendar request.`,
    };
  }

  return { allowed: true };
}

async function recordTokenUsage({
  userId,
  promptTokens,
  completionTokens,
  totalTokens,
}: {
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}) {
  const usageDate = getUsageDateKey();

  await db
    .insert(agentTokenUsage)
    .values({
      id: getUsageId(userId, usageDate),
      userId,
      usageDate,
      requestCount: 1,
      promptTokens,
      completionTokens,
      totalTokens,
    })
    .onConflictDoUpdate({
      target: agentTokenUsage.id,
      set: {
        requestCount: sql`${agentTokenUsage.requestCount} + 1`,
        promptTokens: sql`${agentTokenUsage.promptTokens} + ${promptTokens}`,
        completionTokens: sql`${agentTokenUsage.completionTokens} + ${completionTokens}`,
        totalTokens: sql`${agentTokenUsage.totalTokens} + ${totalTokens}`,
        updatedAt: new Date(),
      },
    });
}

export function validateToolCall(toolName: string, args: Record<string, unknown>) {
  if (!allowedToolNames.has(toolName)) {
    return `Tool '${toolName}' is not allowed for this assistant.`;
  }

  const argsText = JSON.stringify(args).toLowerCase();

  if (toolName === "run_script") {
    const scriptValue = Object.entries(args).find(([key]) => {
      const k = key.toLowerCase();
      return k.includes("script") || k.includes("code");
    })?.[1];
    const script = typeof scriptValue === "string" ? scriptValue : "";
    const loweredScript = script.toLowerCase();

    if (!/\bcorsair\.(gmail|googlecalendar)\b/.test(loweredScript)) {
      return "run_script may only be used for Gmail or Google Calendar operations.";
    }

    if (/\bcorsair\.(?!gmail\b|googlecalendar\b)[a-z0-9_]+/i.test(script)) {
      return "Only corsair.gmail and corsair.googlecalendar operations are allowed.";
    }

    // AST-based security analysis
    try {
      const sourceFile = ts.createSourceFile("inline.js", script, ts.ScriptTarget.Latest, true);
      let safe = true;
      let reason: string | undefined;

      const disallowedIdentifiers = new Set([
        "process",
        "globalthis",
        "global",
        "require",
        "eval",
        "function",
        "constructor",
        "module",
        "exports",
        "window",
        "document",
        "fetch",
        "xmlhttprequest",
        "openai",
        "fs",
        "path",
        "child_process",
        "os",
        "http",
        "https",
        "import",
      ]);

      function visit(node: ts.Node) {
        if (!safe) return;

        // Block functions, arrow functions, and classes
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isClassDeclaration(node) ||
          ts.isClassExpression(node)
        ) {
          safe = false;
          reason = "Declaring functions, arrow functions, or classes is not allowed.";
          return;
        }

        // Block 'this' keyword
        if (node.kind === ts.SyntaxKind.ThisKeyword) {
          safe = false;
          reason = "Accessing 'this' keyword is not allowed.";
          return;
        }

        // Block bracket element access (e.g. obj[prop] or obj['prop']) to prevent property name obfuscation
        if (ts.isElementAccessExpression(node)) {
          safe = false;
          reason = "Dynamic/bracket property accesses (e.g. obj[key]) are not allowed. Use dot notation.";
          return;
        }

        // Block disallowed security-sensitive identifiers
        if (ts.isIdentifier(node)) {
          const name = node.text.toLowerCase();
          if (disallowedIdentifiers.has(name)) {
            safe = false;
            reason = `Use of identifier '${node.text}' is blocked for security.`;
            return;
          }
        }

        // Block sensitive properties accessed via dot notation (e.g. obj.constructor)
        if (ts.isPropertyAccessExpression(node)) {
          const propName = node.name.text.toLowerCase();
          if (propName === "constructor" || propName === "prototype") {
            safe = false;
            reason = `Accessing sensitive property '${node.name.text}' is blocked.`;
            return;
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      if (!safe) {
        return reason;
      }
    } catch (err: any) {
      return `Failed to parse script: ${err.message}`;
    }
  }

  if ((toolName === "get_schema" || toolName === "list_operations") && argsText.length > 2) {
    if (!/(gmail|googlecalendar|calendar)/.test(argsText)) {
      return "Only Gmail and Google Calendar tool schemas or operations are allowed.";
    }
  }

  return undefined;
}

// ─── Message schema ───────────────────────────────────────────────────────────

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// ─── Helper: Convert Zod Shape to OpenAI JSON Schema Parameters ────────────────

function zodShapeToJsonSchema(shape: z.ZodRawShape) {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(shape)) {
    let type = "string";
    let description = "";
    let enumValues: string[] | undefined;
    let isOptional = false;

    let current = field;
    while (current) {
      const typeName = (current as any)._def?.typeName;
      if (typeName === "ZodOptional") {
        isOptional = true;
        current = (current as any)._def.innerType;
      } else if (typeName === "ZodNullable") {
        current = (current as any)._def.innerType;
      } else if (typeName === "ZodDefault") {
        current = (current as any)._def.innerType;
      } else if (typeName === "ZodEffects") {
        current = (current as any)._def.schema;
      } else {
        break;
      }
    }

    const typeName = (current as any)._def?.typeName;
    description = (current as any).description || (field as any).description || "";

    if (typeName === "ZodEnum") {
      type = "string";
      enumValues = (current as any)._def.values;
    } else if (typeName === "ZodNumber") {
      type = "number";
    } else if (typeName === "ZodBoolean") {
      type = "boolean";
    } else if (typeName === "ZodArray") {
      type = "array";
    } else if (typeName === "ZodObject") {
      type = "object";
    }

    properties[key] = {
      type,
      ...(description ? { description } : {}),
      ...(enumValues ? { enum: enumValues } : {}),
    };

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

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

      // 1. Auto-prune old messages
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            lt(chatMessages.createdAt, oneWeekAgo),
          ),
        );

      // 2. Fetch history
      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(asc(chatMessages.createdAt));

      return {
        messages: history.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          toolsUsed: m.toolsUsed as string[] | undefined,
          createdAt: m.createdAt,
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
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      return { success: true };
    }),

  // AI chat completion, scoped to user and persisting new messages
  chat: tenantProcedure
    .meta({ openapi: { method: "POST", path: getPath("/chat"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        message: z.string(),
        model: z.string().optional().default("gpt-4o"),
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
      if (!process.env.OPENAI_API_KEY) {
        return {
          reply: "AI chat is not configured. Please set the OPENAI_API_KEY environment variable.",
          toolsUsed: [],
          success: false,
        };
      }

      const userId = ctx.session.user.id;

      // 1. Guardrail: evaluate scope of the incoming user request
      const scopeCheck = evaluateAssistantScope(input.message);
      if (!scopeCheck.allowed) {
        const reply = buildScopeReply(scopeCheck.reason ?? "this request");

        // Save out-of-scope messages to DB to show in history
        const userMsgId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: userMsgId,
          userId,
          role: "user",
          content: input.message,
        });

        const assistantMsgId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: assistantMsgId,
          userId,
          role: "assistant",
          content: reply,
        });

        return {
          reply,
          toolsUsed: [],
          success: true,
        };
      }

      // 2. Direct usage query support: if asking for token quota status
      if (isUsageRequest(input.message)) {
        const summary = await getTokenUsageSummary(userId);
        const reply = `Your daily assistant token usage: ${summary.totalTokens}/${summary.dailyTokenLimit} tokens used (${summary.remainingTokens} remaining). Requests: ${summary.requestCount}/${summary.dailyRequestLimit} (${summary.remainingRequests} remaining).`;

        const userMsgId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: userMsgId,
          userId,
          role: "user",
          content: input.message,
        });

        const assistantMsgId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: assistantMsgId,
          userId,
          role: "assistant",
          content: reply,
        });

        return {
          reply,
          toolsUsed: [],
          success: true,
        };
      }

      // 3. Save user's new message to DB
      const userMsgId = crypto.randomUUID();
      await db.insert(chatMessages).values({
        id: userMsgId,
        userId,
        role: "user",
        content: input.message,
      });

      // 4. Fetch/Prune history to construct OpenAI messages context
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            lt(chatMessages.createdAt, oneWeekAgo),
          ),
        );

      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(asc(chatMessages.createdAt));

      // Scope corsair to this tenant
      const client = corsair.withTenant(userId);

      // Build official Corsair MCP tools: list_operations, get_schema, run_script
      const corsairTools = buildCorsairToolDefs({
        corsair: client,
        setup: false,
      });

      // Map Corsair MCP tools to OpenAI functions
      const tools: OpenAI.Chat.ChatCompletionTool[] = corsairTools.map((def) => ({
        type: "function",
        function: {
          name: def.name,
          description: def.description,
          parameters: zodShapeToJsonSchema(def.shape),
        },
      }));

      const systemPrompt = `You are a strict, single-purpose automation orchestrator with access to the user's Gmail and Google Calendar via Corsair.

Today's date is ${new Date().toISOString()}.

CRITICAL DIRECTIVES:
1. You are NOT a conversational companion or general knowledge LLM. You must ONLY perform automation tasks: searching Gmail, summarizing threads, drafting/sending replies, and managing calendar events/Google Meet invitations.
2. If the user asks general questions, programming help, Q&A, or writing requests that are not direct email/calendar automations, you must refuse politely and concisely.
3. Keep all responses extremely concise, direct, and short to minimize token consumption. Do not write lengthy explanations, conversational filler, or verbose summaries.
4. You have access to the Corsair MCP tools:
   - list_operations: List available operations under 'gmail' and 'googlecalendar'.
   - get_schema: Get the parameter schema for any operation path (e.g. 'gmail.api.messages.send').
   - run_script: Run a JavaScript script with the scoped 'corsair' instance in scope. You MUST use 'run_script' to perform any actions on Gmail or Google Calendar.
   
   Example scripts to write:
   // To list threads:
   const result = await corsair.gmail.api.threads.list({ maxResults: 10 });
   return result;

   // To send an email:
   const headers = ["To: someone@example.com", "Subject: Hello from Corsair"];
   const mimeMessage = headers.join("\\r\\n") + "\\r\\n\\r\\n" + "This is the email body content.";
   const result = await corsair.gmail.api.messages.send({
     raw: Buffer.from(mimeMessage).toString("base64url")
   });
   return result;

   // To create a calendar invite:
   const result = await corsair.googlecalendar.api.events.create({
     calendarId: "primary",
     event: {
       summary: "Product sync",
       start: { dateTime: "2026-06-18T09:00:00Z", timeZone: "UTC" },
       end: { dateTime: "2026-06-18T10:00:00Z", timeZone: "UTC" },
       attendees: [{ email: "friend@corsair.dev" }]
     },
     sendNotifications: true
   });
   return result;

5. NEVER wrap your script inside an 'async function main()' or other wrapper function. Write your code directly at the top level of the script.
6. Google Meet creation requires 'conferenceDataVersion: 1' as a top-level property and 'conferenceData: { createRequest: { requestId: String(Math.random()), conferenceSolutionKey: { type: "hangoutsMeet" } } }' inside the 'event' object.
7. When accessing property values on API return values, ALWAYS use optional chaining (e.g. 'result.conferenceData?.entryPoints?.[0]?.uri') to safely handle undefined values.
8. When you send or reply to an email, you MUST include a relative link to view the sent email thread in your final response in this exact format: [View Sent Email](/inbox?threadId=<threadId>). NEVER prepend a domain (like mail.google.com) to this link. Place it naturally.`;

      // Construct OpenAI message parameters from DB history (user/assistant only, system prepended)
      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // 5. Check remaining token budget
      const estimatedInputTokens = estimateMessagesTokens(apiMessages);
      const usageSummary = await getTokenUsageSummary(userId);
      const budgetCheck = hasBudgetForRequest(usageSummary, estimatedInputTokens);
      if (!budgetCheck.allowed) {
        const reply = budgetCheck.reply ?? "Daily usage budget reached. Please try again tomorrow.";

        const assistantMsgId = crypto.randomUUID();
        await db.insert(chatMessages).values({
          id: assistantMsgId,
          userId,
          role: "assistant",
          content: reply,
        });

        return {
          reply,
          toolsUsed: [],
          success: true,
        };
      }

      const toolsUsed: string[] = [];
      let finalReply = "";

      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalTokens = 0;

      // Agentic loop — allow up to 5 tool call rounds
      for (let round = 0; round < 5; round++) {
        const response = await openai.chat.completions.create({
          model: sanitizeModel(input.model),
          messages: apiMessages,
          tools,
          tool_choice: "auto",
        });

        if (response.usage) {
          totalPromptTokens += response.usage.prompt_tokens;
          totalCompletionTokens += response.usage.completion_tokens;
          totalTokens += response.usage.total_tokens;
        }

        const message = response.choices[0]?.message;
        if (!message) break;

        apiMessages.push(message);

        // No more tool calls → return final answer
        if (!message.tool_calls || message.tool_calls.length === 0) {
          finalReply = message.content ?? "Done.";
          break;
        }

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const tc = toolCall as any;
          if (!tc.function) continue;
          const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          toolsUsed.push(tc.function.name);
          let toolResult = "";

          // Apply input arguments guardrails check
          const validationError = validateToolCall(tc.function.name, args);
          if (validationError) {
            toolResult = JSON.stringify({ error: validationError });
          } else if (tc.function.name === "run_script") {
            try {
              const scriptCode = String(args.code || args.script || "");
              
              // Run in a secure VM sandbox with execution timeouts
              const sandbox = {
                corsair: client,
                Buffer,
                Date,
                console,
                URL,
                Math,
                JSON,
              };

              const vmPromise = new Promise((resolve, reject) => {
                try {
                  const wrappedCode = `(async () => {
                    ${scriptCode}
                  })()`;
                  const resultPromise = vm.runInNewContext(wrappedCode, sandbox, {
                    timeout: 4000, // Sync CPU execution limit
                  });
                  resolve(resultPromise);
                } catch (e) {
                  reject(e);
                }
              });

              const asyncTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Script execution timed out (4s async limit)")), 4000)
              );

              const runResult = await Promise.race([vmPromise, asyncTimeoutPromise]);
              toolResult = typeof runResult === "string" ? runResult : JSON.stringify(runResult);
            } catch (err) {
              toolResult = JSON.stringify({ error: `Sandbox Execution Error: ${String(err)}` });
            }
          } else {
            try {
              const matchedTool = corsairTools.find((t) => t.name === tc.function.name);
              if (matchedTool) {
                const res = await matchedTool.handler(args);
                const textContent = res.content.find((c) => c.type === "text");
                toolResult = textContent && "text" in textContent ? textContent.text : JSON.stringify(res);
              } else {
                toolResult = JSON.stringify({ error: `Tool ${tc.function.name} not found` });
              }
            } catch (err) {
              toolResult = JSON.stringify({ error: String(err) });
            }
          }

          apiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }
      }

      if (!finalReply) {
        const lastAssistant = [...apiMessages].reverse().find((m) => m.role === "assistant");
        finalReply =
          typeof lastAssistant?.content === "string"
            ? lastAssistant.content
            : "I completed the actions but ran out of space to respond fully.";
      }

      // 5.5 Post-process response to ensure any mail.google.com/inbox links are converted to relative links
      if (finalReply) {
        finalReply = finalReply.replace(/https?:\/\/(?:mail\.)?google\.com\/inbox\?/gi, "/inbox?");
      }

      // 6. Save assistant's reply to DB
      const assistantMsgId = crypto.randomUUID();
      await db.insert(chatMessages).values({
        id: assistantMsgId,
        userId,
        role: "assistant",
        content: finalReply,
        toolsUsed,
      });

      // 7. Record accumulated token usage stats in DB
      await recordTokenUsage({
        userId,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens,
      });

      return {
        reply: finalReply,
        toolsUsed,
        success: true,
      };
    }),
});
