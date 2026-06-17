import { corsair } from "../corsair";
import OpenAI from "openai";
import { buildCorsairToolDefs } from "@corsair-dev/mcp";
import vm from "node:vm";
import { tokenBudgetService } from "./token-budget.service";
import { scopeValidatorService } from "./scope-validator.service";
import { toolValidatorService } from "./tool-validator.service";
import { chatMessageRepository } from "../chat/repository";
import { z } from "zod";
import crypto from "crypto";

export class AgentOrchestratorService {
  private openai: OpenAI;
  private defaultModel: string;
  private allowedModelNames: Set<string>;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy-key" });
    this.defaultModel = process.env.AGENT_MODEL || "gpt-4o-mini";
    this.allowedModelNames = new Set([
      this.defaultModel,
      "gpt-5",
      "gpt-5-mini",
      "gpt-4o",
      "gpt-4o-mini",
      process.env.EMAIL_MODEL || "gpt-5-mini",
      process.env.PLANNER_MODEL || "gpt-4o-mini",
      process.env.CALENDAR_MODEL || "gpt-4o-mini",
      process.env.SEARCH_MODEL || "gpt-4o-mini",
    ]);
  }

  private selectModelForTask(message: string, modelName?: string): string {
    // If a valid model was explicitly requested by the client, use it directly
    if (modelName && this.allowedModelNames.has(modelName)) {
      return modelName;
    }

    const msg = message.toLowerCase();

    // Read configured models from environment variables
    const emailModel = process.env.EMAIL_MODEL || "gpt-5-mini";
    const plannerModel = process.env.PLANNER_MODEL || "gpt-4o-mini";
    const calendarModel = process.env.CALENDAR_MODEL || "gpt-4o-mini";
    const searchModel = process.env.SEARCH_MODEL || "gpt-4o-mini";

    // 1. Planning / Multi-step coordination
    const requiresPlanning = msg.includes(" and ") || msg.includes(" then ") || msg.includes(" also ") || /\b(plan|coordinate|sequence|workflow)\b/i.test(msg);
    if (requiresPlanning) {
      return plannerModel;
    }

    // 2. Email drafting
    const requiresEmailDrafting = /\b(draft|write|compose|send|reply|replying|email|mail|message|template)\b/i.test(msg) && 
                                  !/\b(search|find|show|list|get|check)\b/i.test(msg);
    if (requiresEmailDrafting) {
      return emailModel;
    }

    // 3. Calendar operations
    const isCalendarTask = /\b(schedule|calendar|meet|meeting|event|appointment|invite|scheduling|availability)\b/i.test(msg);
    if (isCalendarTask) {
      return calendarModel;
    }

    // 4. Search and lookups
    const isSearchTask = /\b(search|find|show|list|get|check|threads?|inbox)\b/i.test(msg);
    if (isSearchTask) {
      return searchModel;
    }

    // Default fallback
    return searchModel;
  }

  private zodShapeToJsonSchema(shape: z.ZodRawShape) {
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

  public async chat({
    userId,
    message,
    model,
  }: {
    userId: string;
    message: string;
    model?: string;
  }): Promise<{ reply: string; toolsUsed: string[]; success: boolean }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        reply: "AI chat is not configured. Please set the OPENAI_API_KEY environment variable.",
        toolsUsed: [],
        success: false,
      };
    }

    // 1. Guardrail: evaluate scope
    const scopeCheck = scopeValidatorService.evaluateAssistantScope(message);
    if (!scopeCheck.allowed) {
      const reply = scopeValidatorService.buildScopeReply(scopeCheck.reason ?? "this request");
      await chatMessageRepository.create({
        id: crypto.randomUUID(),
        userId,
        role: "user",
        content: message,
      });
      await chatMessageRepository.create({
        id: crypto.randomUUID(),
        userId,
        role: "assistant",
        content: reply,
      });
      return { reply, toolsUsed: [], success: true };
    }

    // 2. Direct usage query
    if (scopeValidatorService.isUsageRequest(message)) {
      const summary = await tokenBudgetService.getSummary(userId);
      const reply = `Your daily assistant token usage: ${summary.totalTokens}/${summary.dailyTokenLimit} tokens used (${summary.remainingTokens} remaining). Requests: ${summary.requestCount}/${summary.dailyRequestLimit} (${summary.remainingRequests} remaining).`;
      await chatMessageRepository.create({
        id: crypto.randomUUID(),
        userId,
        role: "user",
        content: message,
      });
      await chatMessageRepository.create({
        id: crypto.randomUUID(),
        userId,
        role: "assistant",
        content: reply,
      });
      return { reply, toolsUsed: [], success: true };
    }

    // 3. Save user's message
    await chatMessageRepository.create({
      id: crypto.randomUUID(),
      userId,
      role: "user",
      content: message,
    });

    // 4. Fetch/Prune history to construct OpenAI messages context
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    await chatMessageRepository.pruneOldMessages(userId, oneWeekAgo);

    const history = await chatMessageRepository.findByUserId(userId);

    // Scope corsair client to tenant
    const client = corsair.withTenant(userId);

    // Build tools
    const corsairTools = buildCorsairToolDefs({
      corsair: client,
      setup: false,
    });

    const tools: OpenAI.Chat.ChatCompletionTool[] = corsairTools.map((def) => ({
      type: "function",
      function: {
        name: def.name,
        description: def.description,
        parameters: this.zodShapeToJsonSchema(def.shape),
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

    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 5. Budget Check
    const estimatedInputTokens = tokenBudgetService.estimateMessagesTokens(apiMessages);
    const usageSummary = await tokenBudgetService.getSummary(userId);
    const budgetCheck = tokenBudgetService.hasBudget(usageSummary, estimatedInputTokens);
    if (!budgetCheck.allowed) {
      const reply = budgetCheck.reply ?? "Daily usage budget reached. Please try again tomorrow.";
      await chatMessageRepository.create({
        id: crypto.randomUUID(),
        userId,
        role: "assistant",
        content: reply,
      });
      return { reply, toolsUsed: [], success: true };
    }

    const toolsUsed: string[] = [];
    let finalReply = "";
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;

    for (let round = 0; round < 5; round++) {
      const response = await this.openai.chat.completions.create({        model: this.selectModelForTask(message, model),
        messages: apiMessages,
        tools,
        tool_choice: "auto",
      });

      if (response.usage) {
        totalPromptTokens += response.usage.prompt_tokens;
        totalCompletionTokens += response.usage.completion_tokens;
        totalTokens += response.usage.total_tokens;
      }

      const responseMessage = response.choices[0]?.message;
      if (!responseMessage) break;

      apiMessages.push(responseMessage);

      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        finalReply = responseMessage.content ?? "Done.";
        break;
      }

      for (const toolCall of responseMessage.tool_calls) {
        const tc = toolCall as any;
        if (!tc.function) continue;
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        toolsUsed.push(tc.function.name);
        let toolResult = "";

        const validationError = toolValidatorService.validateToolCall(tc.function.name, args);
        if (validationError) {
          toolResult = JSON.stringify({ error: validationError });
        } else if (tc.function.name === "run_script") {
          try {
            const scriptCode = String(args.code || args.script || "");
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
                  timeout: 4000,
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

    if (finalReply) {
      finalReply = finalReply.replace(/https?:\/\/(?:mail\.)?google\.com\/inbox\?/gi, "/inbox?");
    }

    await chatMessageRepository.create({
      id: crypto.randomUUID(),
      userId,
      role: "assistant",
      content: finalReply,
      toolsUsed,
    });

    await tokenBudgetService.recordUsage({
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
  }
}
export const agentOrchestratorService = new AgentOrchestratorService();
