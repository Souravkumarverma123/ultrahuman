import { z } from "../../schema";
import { corsair } from "@repo/services/corsair";
import { publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import OpenAI from "openai";

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

// ─── Router ──────────────────────────────────────────────────────────────────

export const agentRouter = router({
  chat: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/chat"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        messages: z.array(chatMessageSchema),
        model: z.string().optional().default("gpt-4o"),
      })
    )
    .output(
      z.object({
        reply: z.string(),
        toolsUsed: z.array(z.string()),
        success: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) {
        return {
          reply: "AI chat is not configured. Please set the OPENAI_API_KEY environment variable.",
          toolsUsed: [],
          success: false,
        };
      }

      // Build Corsair tools for OpenAI via the MCP adapter
      // We define the key Gmail + Calendar operations as OpenAI function tools
      const tools: OpenAI.Chat.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "list_email_threads",
            description:
              "List recent email threads from the user's Gmail inbox. Use this to show recent emails or find specific emails.",
            parameters: {
              type: "object",
              properties: {
                labelIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Gmail labels to filter by (default: INBOX)",
                },
                q: {
                  type: "string",
                  description: "Gmail search query, e.g. 'from:john@example.com subject:meeting'",
                },
                maxResults: {
                  type: "number",
                  description: "Number of threads to return (default: 10)",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "send_email",
            description:
              "Send an email via Gmail. Use this when the user asks to send, reply to, or write an email.",
            parameters: {
              type: "object",
              required: ["to", "subject", "body"],
              properties: {
                to: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of recipient email addresses",
                },
                cc: {
                  type: "array",
                  items: { type: "string" },
                  description: "CC email addresses",
                },
                subject: { type: "string", description: "Email subject line" },
                body: { type: "string", description: "Email body text (HTML supported)" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "list_calendar_events",
            description:
              "List upcoming calendar events. Use this to show the user's schedule or check availability.",
            parameters: {
              type: "object",
              required: ["timeMin", "timeMax"],
              properties: {
                timeMin: {
                  type: "string",
                  description: "Start of range (ISO 8601), e.g. '2024-01-15T00:00:00Z'",
                },
                timeMax: {
                  type: "string",
                  description: "End of range (ISO 8601), e.g. '2024-01-21T23:59:59Z'",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_calendar_invite",
            description:
              "Create a Google Calendar event and optionally send an email to attendees. Use this when user wants to schedule a meeting or send a calendar invite.",
            parameters: {
              type: "object",
              required: ["summary", "startDateTime", "endDateTime", "attendeeEmails"],
              properties: {
                summary: { type: "string", description: "Event title" },
                description: { type: "string", description: "Event description" },
                location: { type: "string", description: "Event location or meeting link" },
                startDateTime: {
                  type: "string",
                  description: "Event start (ISO 8601), e.g. '2024-01-18T09:00:00Z'",
                },
                endDateTime: {
                  type: "string",
                  description: "Event end (ISO 8601), e.g. '2024-01-18T10:00:00Z'",
                },
                attendeeEmails: {
                  type: "array",
                  items: { type: "string" },
                  description: "Email addresses of attendees",
                },
                emailBody: {
                  type: "string",
                  description:
                    "Optional: also send this personal email message alongside the calendar invite",
                },
                addGoogleMeet: {
                  type: "boolean",
                  description: "Whether to add a Google Meet link (default: true)",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "search_emails",
            description: "Search Gmail using advanced query syntax.",
            parameters: {
              type: "object",
              required: ["query"],
              properties: {
                query: {
                  type: "string",
                  description:
                    "Gmail search query, e.g. 'from:boss@company.com has:attachment after:2024/01/01'",
                },
                maxResults: { type: "number", description: "Max results (default: 10)" },
              },
            },
          },
        },
      ];

      const systemPrompt = `You are a helpful personal email and calendar assistant with access to the user's Gmail and Google Calendar.

Today's date is ${new Date().toISOString()}.

When the user asks you to do something with their email or calendar, use the available tools to perform the action.
Always be concise, helpful, and proactive. If a user says "send him an email too", send it.
When creating calendar invites with attendees, automatically add a Google Meet link unless they say otherwise.
Format dates and times in a human-friendly way in your responses.
When you send or reply to an email (using send_email), the tool will return a threadId. You MUST include a link to view the sent email thread in your final response in this exact format: [View Sent Email](/inbox?threadId=<threadId>). Place it naturally, for example: "I have sent the email. [View Sent Email](/inbox?threadId=12345)"`;

      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const toolsUsed: string[] = [];

      // Scope corsair to this tenant — required because multiTenancy: true means
      // the root `corsair` is a CorsairTenantWrapper (no plugin namespaces directly).
      const client = corsair.withTenant(input.tenantId);

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
            switch (tc.function.name) {
              case "list_email_threads": {
                const result = await client.gmail.api.threads.list({
                  labelIds: (args.labelIds as string[] | undefined) ?? ["INBOX"],
                  q: args.q as string | undefined,
                  maxResults: (args.maxResults as number | undefined) ?? 10,
                });
                toolResult = JSON.stringify(result?.threads?.slice(0, 10) ?? []);
                break;
              }

              case "send_email": {
                const toList = args.to as string[];
                const ccList = args.cc as string[] | undefined;
                const headersList: string[] = [];
                headersList.push(`To: ${toList.join(", ")}`);
                if (ccList && ccList.length > 0) {
                  headersList.push(`Cc: ${ccList.join(", ")}`);
                }
                headersList.push(`Subject: ${args.subject as string}`);

                const mimeMessage = headersList.join("\r\n") + "\r\n\r\n" + (args.body as string);
                const raw = Buffer.from(mimeMessage).toString("base64url");

                const result = await client.gmail.api.messages.send({
                  raw,
                });
                toolResult = JSON.stringify({ success: true, messageId: result?.id, threadId: result?.threadId || result?.id });
                break;
              }

              case "list_calendar_events": {
                const result = await client.googlecalendar.api.events.getMany({
                  calendarId: "primary",
                  timeMin: args.timeMin as string,
                  timeMax: args.timeMax as string,
                  singleEvents: true,
                  orderBy: "startTime",
                  maxResults: 20,
                });
                toolResult = JSON.stringify(result?.items?.slice(0, 20) ?? []);
                break;
              }

              case "create_calendar_invite": {
                const event = await client.googlecalendar.api.events.create({
                  calendarId: "primary",
                  event: {
                    summary: args.summary as string,
                    description: args.description as string | undefined,
                    location: args.location as string | undefined,
                    start: { dateTime: args.startDateTime as string, timeZone: "UTC" },
                    end: { dateTime: args.endDateTime as string, timeZone: "UTC" },
                    attendees: ((args.attendeeEmails as string[]) ?? []).map((email) => ({ email })),
                  },
                  sendNotifications: true,
                });

                if (args.emailBody) {
                  const attendeeEmails = args.attendeeEmails as string[];
                  const mimeMessage =
                    `To: ${attendeeEmails.join(", ")}\r\n` +
                    `Subject: Invite: ${args.summary as string}\r\n\r\n` +
                    `${args.emailBody as string}`;
                  const raw = Buffer.from(mimeMessage).toString("base64url");

                  await client.gmail.api.messages.send({
                    raw,
                  });
                  toolsUsed.push("send_email");
                }

                toolResult = JSON.stringify({ success: true, event });
                break;
              }

              case "search_emails": {
                const result = await client.gmail.api.threads.list({
                  q: args.query as string,
                  maxResults: (args.maxResults as number | undefined) ?? 10,
                });
                toolResult = JSON.stringify(result?.threads?.slice(0, 10) ?? []);
                break;
              }

              default:
                toolResult = JSON.stringify({ error: "Unknown tool" });
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
