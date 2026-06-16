import { z } from "zod";

export const zodUndefinedModel = z.undefined().describe("undefined");

// ─── Webhook Schemas ───────────────────────────────────────────────────────────

export const gmailMessageSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  internalDate: z.string().optional(),
  payload: z.object({
    headers: z.array(
      z.object({
        name: z.string().optional(),
        value: z.string().optional(),
      })
    ).optional(),
  }).optional(),
});

export const gmailWebhookDataSchema = z.object({
  type: z.string().optional(),
  emailAddress: z.string().optional(),
  historyId: z.string().optional(),
  labelsAdded: z.array(z.string()).optional(),
  labelsRemoved: z.array(z.string()).optional(),
  message: gmailMessageSchema.optional(),
});

export const calendarDateTimeSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional(),
});

export const calendarAttendeeSchema = z.object({
  email: z.string(),
  displayName: z.string().optional(),
  organizer: z.boolean().optional(),
  self: z.boolean().optional(),
  responseStatus: z.string().optional(),
});

export const calendarOrganizerSchema = z.object({
  email: z.string().optional(),
  displayName: z.string().optional(),
  self: z.boolean().optional(),
});

export const calendarEventSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  htmlLink: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  colorId: z.string().optional(),
  organizer: calendarOrganizerSchema.optional(),
  start: calendarDateTimeSchema.optional(),
  end: calendarDateTimeSchema.optional(),
  attendees: z.array(calendarAttendeeSchema).optional(),
  hangoutLink: z.string().optional(),
});

export const calendarWebhookDataSchema = z.object({
  type: z.string().optional(),
  calendarId: z.string().optional(),
  eventId: z.string().optional(),
  timestamp: z.string().optional(),
  event: calendarEventSchema.optional(),
});

export const corsairWebhookPayloadSchema = z.object({
  success: z.boolean(),
  corsairEntityId: z.string().optional(),
  data: z.union([gmailWebhookDataSchema, calendarWebhookDataSchema]).optional(),
});

export const corsairWebhookEventSchema = z.object({
  tenantId: z.string().optional(),
  plugin: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  payload: corsairWebhookPayloadSchema.optional(),
});

export { z };
