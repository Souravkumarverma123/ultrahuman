import { z } from "../../schema";
import { corsair, generateOAuthUrl } from "@repo/services/corsair";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Calendar"];
const getPath = generatePath("/calendar");

// ─── Output schemas ──────────────────────────────────────────────────────────

const attendeeSchema = z.object({
  email: z.string(),
  displayName: z.string().optional(),
  responseStatus: z.enum(["accepted", "declined", "tentative", "needsAction"]).optional(),
  organizer: z.boolean().optional(),
  self: z.boolean().optional(),
});

const calendarEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  allDay: z.boolean().optional(),
  attendees: z.array(attendeeSchema).optional(),
  organizerEmail: z.string().optional(),
  meetLink: z.string().optional(),
  status: z.string().optional(),
  htmlLink: z.string().optional(),
  colorId: z.string().optional(),
  calendarId: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const calendarRouter = router({
  // Get OAuth connect URL for Google Calendar
  getAuthUrl: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/auth-url"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ url: z.string() }))
    .query(async ({ ctx }) => {
      const tenantId = ctx.session.user.id;
      const baseUrl = process.env.BASE_URL || "http://localhost:8000";
      const redirectUri = `${baseUrl}/corsair/callback`;
      const { url } = await generateOAuthUrl(corsair, "googlecalendar", {
        tenantId,
        redirectUri,
      });
      return { url };
    }),

  // Check if Google Calendar is connected
  getConnectionStatus: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/connection-status"), tags: TAGS } })
    .input(z.object({ tenantId: z.string() }))
    .output(z.object({ connected: z.boolean(), email: z.string().optional() }))
    .query(async ({ ctx }) => {
      try {
        const status = await corsair.manage.connectionStatus.get({ tenantId: ctx.session.user.id });
        const connected = status.googlecalendar === "connected";
        return { connected };
      } catch {
        return { connected: false };
      }
    }),

  // List events in a date range
  listEvents: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/events"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        timeMin: z.string(), // ISO 8601
        timeMax: z.string(), // ISO 8601
        calendarId: z.string().optional().default("primary"),
        maxResults: z.number().optional().default(100),
      }),
    )
    .output(z.object({ events: z.array(calendarEventSchema) }))
    .query(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const result = await client.googlecalendar.api.events.getMany({
        calendarId: input.calendarId,
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        maxResults: input.maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (result?.items ?? []).map((e: Record<string, unknown>) => {
        const start = e.start as Record<string, string> | undefined;
        const end = e.end as Record<string, string> | undefined;
        return {
          id: String(e.id ?? ""),
          summary: String(e.summary ?? "(no title)"),
          description: e.description ? String(e.description) : undefined,
          location: e.location ? String(e.location) : undefined,
          startDateTime: start?.dateTime ?? start?.date ?? new Date().toISOString(),
          endDateTime: end?.dateTime ?? end?.date ?? new Date().toISOString(),
          allDay: Boolean(start?.date && !start?.dateTime),
          attendees: (e.attendees as z.infer<typeof attendeeSchema>[]) ?? [],
          organizerEmail: (e.organizer as Record<string, string>)?.email ?? undefined,
          meetLink: e.hangoutLink ? String(e.hangoutLink) : undefined,
          status: e.status ? String(e.status) : undefined,
          htmlLink: e.htmlLink ? String(e.htmlLink) : undefined,
          colorId: e.colorId ? String(e.colorId) : undefined,
          calendarId: input.calendarId,
        };
      });

      return { events };
    }),

  // Get a single event
  getEvent: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/events/:eventId"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        eventId: z.string(),
        calendarId: z.string().optional().default("primary"),
      }),
    )
    .output(calendarEventSchema)
    .query(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const e = (await client.googlecalendar.api.events.get({
        calendarId: input.calendarId,
        id: input.eventId,
      })) as Record<string, unknown>;

      const start = e.start as Record<string, string> | undefined;
      const end = e.end as Record<string, string> | undefined;
      return {
        id: String(e.id ?? input.eventId),
        summary: String(e.summary ?? "(no title)"),
        description: e.description ? String(e.description) : undefined,
        location: e.location ? String(e.location) : undefined,
        startDateTime: start?.dateTime ?? start?.date ?? new Date().toISOString(),
        endDateTime: end?.dateTime ?? end?.date ?? new Date().toISOString(),
        allDay: Boolean(start?.date && !start?.dateTime),
        attendees: (e.attendees as z.infer<typeof attendeeSchema>[]) ?? [],
        organizerEmail: (e.organizer as Record<string, string>)?.email ?? undefined,
        status: e.status ? String(e.status) : undefined,
        htmlLink: e.htmlLink ? String(e.htmlLink) : undefined,
      };
    }),

  // Create a calendar event
  createEvent: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/events"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        calendarId: z.string().optional().default("primary"),
        summary: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        startDateTime: z.string(),
        endDateTime: z.string(),
        attendeeEmails: z.array(z.string()).optional(),
        addGoogleMeet: z.boolean().optional().default(false),
        sendNotifications: z.boolean().optional().default(true),
      }),
    )
    .output(calendarEventSchema)
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const e = (await client.googlecalendar.api.events.create({
        calendarId: input.calendarId,
        event: {
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.startDateTime, timeZone: "UTC" },
          end: { dateTime: input.endDateTime, timeZone: "UTC" },
          attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
        },
        sendNotifications: input.sendNotifications,
        conferenceDataVersion: input.addGoogleMeet ? 1 : undefined,
      })) as Record<string, unknown>;

      const start = e.start as Record<string, string> | undefined;
      const end = e.end as Record<string, string> | undefined;
      return {
        id: String(e.id ?? ""),
        summary: String(e.summary ?? input.summary),
        description: e.description ? String(e.description) : undefined,
        location: e.location ? String(e.location) : undefined,
        startDateTime: start?.dateTime ?? input.startDateTime,
        endDateTime: end?.dateTime ?? input.endDateTime,
        attendees: (e.attendees as z.infer<typeof attendeeSchema>[]) ?? [],
        htmlLink: e.htmlLink ? String(e.htmlLink) : undefined,
      };
    }),

  // Create event AND send an email invite to attendees
  createInvite: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/invite"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        startDateTime: z.string(),
        endDateTime: z.string(),
        attendeeEmails: z.array(z.string()),
        emailBody: z.string().optional(),
        addGoogleMeet: z.boolean().optional().default(true),
      }),
    )
    .output(
      z.object({
        event: calendarEventSchema,
        emailsSent: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);

      // Create the calendar event
      const e = (await client.googlecalendar.api.events.create({
        calendarId: "primary",
        event: {
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: { dateTime: input.startDateTime, timeZone: "UTC" },
          end: { dateTime: input.endDateTime, timeZone: "UTC" },
          attendees: input.attendeeEmails.map((email) => ({ email })),
        },
        sendNotifications: true,
        conferenceDataVersion: input.addGoogleMeet ? 1 : undefined,
      })) as Record<string, unknown>;

      // Optionally also send a personal email alongside the calendar invite
      if (input.emailBody) {
        const raw = Buffer.from(
          `To: ${input.attendeeEmails.join(", ")}\r\n` +
            `Subject: Invite: ${input.summary}\r\n\r\n` +
            `${input.emailBody}`,
        ).toString("base64url");
        await client.gmail.api.messages.send({
          raw,
        });
      }

      const start = e.start as Record<string, string> | undefined;
      const end = e.end as Record<string, string> | undefined;
      return {
        event: {
          id: String(e.id ?? ""),
          summary: String(e.summary ?? input.summary),
          description: e.description ? String(e.description) : undefined,
          location: e.location ? String(e.location) : undefined,
          startDateTime: start?.dateTime ?? input.startDateTime,
          endDateTime: end?.dateTime ?? input.endDateTime,
          attendees: (e.attendees as z.infer<typeof attendeeSchema>[]) ?? [],
          htmlLink: e.htmlLink ? String(e.htmlLink) : undefined,
        },
        emailsSent: Boolean(input.emailBody),
      };
    }),

  // Update an event
  updateEvent: protectedProcedure
    .meta({ openapi: { method: "PUT", path: getPath("/events/:eventId"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        eventId: z.string(),
        calendarId: z.string().optional().default("primary"),
        summary: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        startDateTime: z.string().optional(),
        endDateTime: z.string().optional(),
        attendeeEmails: z.array(z.string()).optional(),
        sendNotifications: z.boolean().optional().default(true),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      const patch: Record<string, unknown> = {};
      if (input.summary) patch.summary = input.summary;
      if (input.description) patch.description = input.description;
      if (input.location) patch.location = input.location;
      if (input.startDateTime) patch.start = { dateTime: input.startDateTime, timeZone: "UTC" };
      if (input.endDateTime) patch.end = { dateTime: input.endDateTime, timeZone: "UTC" };
      if (input.attendeeEmails) {
        patch.attendees = input.attendeeEmails.map((email) => ({ email }));
      }

      await client.googlecalendar.api.events.update({
        calendarId: input.calendarId,
        id: input.eventId,
        sendNotifications: input.sendNotifications,
        event: patch,
      });

      return { success: true };
    }),

  // Update RSVP status for the current user
  updateRSVP: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/events/:eventId/rsvp"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        eventId: z.string(),
        calendarId: z.string().optional().default("primary"),
        responseStatus: z.enum(["accepted", "declined", "tentative", "needsAction"]),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      
      // 1. Fetch the existing event to get the current list of attendees
      const event = (await client.googlecalendar.api.events.get({
        calendarId: input.calendarId,
        id: input.eventId,
      })) as any;

      if (!event) {
        throw new Error("Event not found");
      }

      const attendees = event.attendees || [];
      
      // 2. Find the attendee corresponding to the current user
      const userEmail = ctx.session.user.email;
      let userAttendee = attendees.find((a: any) => a.self);
      
      if (!userAttendee && userEmail) {
        userAttendee = attendees.find(
          (a: any) => a.email?.toLowerCase() === userEmail.toLowerCase()
        );
      }

      if (!userAttendee && input.calendarId.includes("@")) {
        userAttendee = attendees.find(
          (a: any) => a.email?.toLowerCase() === input.calendarId.toLowerCase()
        );
      }

      if (userAttendee) {
        userAttendee.responseStatus = input.responseStatus;
      } else if (userEmail) {
        attendees.push({
          email: userEmail,
          responseStatus: input.responseStatus,
        });
      }

      // 3. Save the updated attendees list back to the event, passing all existing event details to prevent loss and satisfy Google API constraints
      const patch: any = { attendees };
      if (event.summary !== undefined) patch.summary = event.summary;
      if (event.description !== undefined) patch.description = event.description;
      if (event.location !== undefined) patch.location = event.location;
      if (event.start !== undefined) patch.start = event.start;
      if (event.end !== undefined) patch.end = event.end;
      if (event.recurrence !== undefined) patch.recurrence = event.recurrence;
      if (event.status !== undefined) patch.status = event.status;
      if (event.reminders !== undefined) patch.reminders = event.reminders;
      if (event.colorId !== undefined) patch.colorId = event.colorId;
      if (event.transparency !== undefined) patch.transparency = event.transparency;
      if (event.visibility !== undefined) patch.visibility = event.visibility;
      if (event.eventType !== undefined) patch.eventType = event.eventType;
      if (event.guestsCanModify !== undefined) patch.guestsCanModify = event.guestsCanModify;
      if (event.guestsCanInviteOthers !== undefined) patch.guestsCanInviteOthers = event.guestsCanInviteOthers;
      if (event.guestsCanSeeOtherGuests !== undefined) patch.guestsCanSeeOtherGuests = event.guestsCanSeeOtherGuests;
      if (event.anyoneCanAddSelf !== undefined) patch.anyoneCanAddSelf = event.anyoneCanAddSelf;

      await client.googlecalendar.api.events.update({
        calendarId: input.calendarId,
        id: input.eventId,
        event: patch,
      });

      return { success: true };
    }),

  // Delete an event
  deleteEvent: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/events/:eventId"), tags: TAGS } })
    .input(
      z.object({
        tenantId: z.string(),
        eventId: z.string(),
        calendarId: z.string().optional().default("primary"),
        sendNotifications: z.boolean().optional().default(true),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const client = corsair.withTenant(ctx.session.user.id);
      await client.googlecalendar.api.events.delete({
        calendarId: input.calendarId,
        id: input.eventId,
        sendNotifications: input.sendNotifications,
      });
      return { success: true };
    }),
});
