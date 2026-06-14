import { z } from "../../schema";
import { corsair } from "@repo/services/corsair";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import OpenAI from "openai";
import { buildCorsairToolDefs } from "@corsair-dev/mcp";

const TAGS = ["Agent"];
const getPath = generatePath("/agent");

if (!process.env.OPENAI_API_KEY) {
  console.warn("[agent] OPENAI_API_KEY not set — AI chat will be unavailable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });

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

// ─── Router ──────────────────────────────────────────────────────────────────

export const agentRouter = router({
  chat: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/chat"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        messages: z.array(chatMessageSchema),
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

      // Scope corsair to this tenant
      const client = corsair.withTenant(ctx.session.user.id);

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

      const systemPrompt = `You are a helpful personal email and calendar assistant with access to the user's Gmail and Google Calendar via Corsair.

Today's date is ${new Date().toISOString()}.

You have access to the Corsair MCP tools:
1. list_operations: List available operations under 'gmail' and 'googlecalendar'.
2. get_schema: Get the parameter schema for any operation path (e.g. 'gmail.api.messages.send').
3. run_script: Run a JavaScript script with the scoped 'corsair' instance in scope. You MUST use 'run_script' to perform any actions on Gmail or Google Calendar.
   Example scripts to write:
   
   // To list threads:
   const result = await corsair.gmail.api.threads.list({ maxResults: 10 });
   return result;

   // To send an email:
   const headers = [
     "To: someone@example.com",
     "Subject: Hello from Corsair"
   ];
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

Always write clean, modern async JavaScript inside 'run_script' and return the final value.
When you send or reply to an email, the tool will return a result containing a threadId or id. You MUST include a link to view the sent email thread in your final response in this exact format: [View Sent Email](/inbox?threadId=<threadId>). Place it naturally, for example: "I have sent the email. [View Sent Email](/inbox?threadId=12345)"`;

      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const toolsUsed: string[] = [];

      // Agentic loop — allow up to 5 tool call rounds
      for (let round = 0; round < 5; round++) {
        const response = await openai.chat.completions.create({
          model: input.model,
          messages: apiMessages,
          tools,
          tool_choice: "auto",
        });

        const message = response.choices[0]?.message;
        if (!message) break;

        apiMessages.push(message);

        // No more tool calls → return final answer
        if (!message.tool_calls || message.tool_calls.length === 0) {
          return {
            reply: message.content ?? "Done.",
            toolsUsed,
            success: true,
          };
        }

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const tc = toolCall as any;
          if (!tc.function) continue;
          const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          toolsUsed.push(tc.function.name);
          let toolResult = "";

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

          apiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }
      }

      // Fallback after max rounds
      const lastAssistant = [...apiMessages].reverse().find((m) => m.role === "assistant");
      return {
        reply:
          typeof lastAssistant?.content === "string"
            ? lastAssistant.content
            : "I completed the actions but ran out of space to respond fully.",
        toolsUsed,
        success: true,
      };
    }),
});
