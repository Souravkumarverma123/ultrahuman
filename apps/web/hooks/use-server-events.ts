import { useEffect } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";

type JsonRecord = Record<string, unknown>;

type CorsairRealtimeEvent = {
  type: "corsair.webhook";
  plugin: string | null;
  action: string | null;
  receivedAt: string;
  payload?: unknown;
};

type EmailAddress = {
  email: string;
  name?: string;
};

type GmailThread = {
  id: string;
  subject: string;
  snippet: string;
  from: EmailAddress;
  messageCount: number;
  isRead: boolean;
  isStarred: boolean;
  lastMessageAt: string;
  labels: string[];
  messages?: unknown[];
};

type GmailThreadCollection = {
  threads: GmailThread[];
};

type CalendarAttendee = {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
  organizer?: boolean;
  self?: boolean;
};

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  allDay?: boolean;
  attendees?: CalendarAttendee[];
  organizerEmail?: string;
  meetLink?: string;
  status?: string;
  htmlLink?: string;
  colorId?: string;
  calendarId?: string;
};

type CalendarEventCollection = {
  events: CalendarEvent[];
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function getRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => isRecord(item))
    : undefined;
}

function queryKeyContains(queryKey: readonly unknown[], namespace: "gmail" | "calendar") {
  return JSON.stringify(queryKey).includes(`"${namespace}"`);
}

function queryKeyIncludes(queryKey: readonly unknown[], token: string) {
  return JSON.stringify(queryKey).includes(token);
}

function extractQueryInput(queryKey: readonly unknown[]) {
  const visit = (value: unknown): JsonRecord | undefined => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const input = visit(item);
        if (input) return input;
      }
      return undefined;
    }

    if (!isRecord(value)) return undefined;
    if (isRecord(value.input)) return value.input;

    for (const child of Object.values(value)) {
      const input = visit(child);
      if (input) return input;
    }

    return undefined;
  };

  return visit(queryKey);
}

function hasThreads(value: unknown): value is GmailThreadCollection {
  return isRecord(value) && Array.isArray(value.threads);
}

function hasEvents(value: unknown): value is CalendarEventCollection {
  return isRecord(value) && Array.isArray(value.events);
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseEmailAddress(headerVal?: string): EmailAddress {
  if (!headerVal) return { email: "" };
  const match = headerVal.match(/(.*?)\s*<([^>]+)>/);

  if (match) {
    return {
      name: match[1]?.replace(/^["']|["']$/g, "").trim() || undefined,
      email: match[2]?.trim() || "",
    };
  }

  return { email: headerVal.trim() };
}

function getHeader(message: JsonRecord, name: string) {
  const payload = isRecord(message.payload) ? message.payload : undefined;
  const headers = getRecordArray(payload?.headers) ?? [];

  return headers.find((header) => getString(header.name)?.toLowerCase() === name.toLowerCase())
    ?.value;
}

function dateFromGmailInternalDate(value: unknown) {
  const internalDate = getString(value);
  if (!internalDate) return new Date().toISOString();

  const timestamp = Number(internalDate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function buildThreadFromGmailMessage(message: JsonRecord): GmailThread | null {
  const id = getString(message.threadId) ?? getString(message.id);
  if (!id) return null;

  const labels = getStringArray(message.labelIds) ?? [];
  const subject = getString(getHeader(message, "subject"));
  const from = getString(getHeader(message, "from"));

  return {
    id,
    subject: decodeHtmlEntities(subject ?? "(no subject)"),
    snippet: decodeHtmlEntities(getString(message.snippet) ?? ""),
    from: parseEmailAddress(from),
    messageCount: 1,
    isRead: !labels.includes("UNREAD"),
    isStarred: labels.includes("STARRED"),
    lastMessageAt: dateFromGmailInternalDate(message.internalDate),
    labels,
  };
}

function getWebhookData(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) return undefined;
  return payload.data;
}

function shouldThreadBeInList(queryKey: readonly unknown[], thread: GmailThread) {
  if (!queryKeyIncludes(queryKey, "listThreads")) return false;

  const input = extractQueryInput(queryKey);
  if (!input) return false;

  const hasSearch = Boolean(getString(input.q));
  const labelIds = getStringArray(input.labelIds);

  if (hasSearch || !labelIds?.length) return false;

  return labelIds.every((labelId) => thread.labels.includes(labelId));
}

function sortThreadsByLastMessage(threads: GmailThread[]) {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

function patchGmailThreadCollections(queryClient: QueryClient, thread: GmailThread) {
  const queries = queryClient.getQueryCache().findAll({
    predicate: ({ queryKey }) => queryKeyContains(queryKey, "gmail"),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (oldData: unknown) => {
      if (!hasThreads(oldData)) return oldData;

      const existingThread = oldData.threads.find((item) => item.id === thread.id);
      const shouldInclude = shouldThreadBeInList(query.queryKey, thread);

      if (!shouldInclude) {
        if (!existingThread) return oldData;
        return {
          ...oldData,
          threads: oldData.threads.filter((item) => item.id !== thread.id),
        };
      }

      const mergedThread: GmailThread = existingThread
        ? {
            ...existingThread,
            ...thread,
            messageCount: existingThread.messageCount,
            messages: existingThread.messages,
          }
        : thread;
      const threads = [
        mergedThread,
        ...oldData.threads.filter((item) => item.id !== mergedThread.id),
      ];

      return {
        ...oldData,
        threads: sortThreadsByLastMessage(threads),
      };
    });
  }
}

function patchGmailDeletedMessage(queryClient: QueryClient, message: JsonRecord) {
  const threadId = getString(message.threadId) ?? getString(message.id);
  if (!threadId) return;

  const queries = queryClient.getQueryCache().findAll({
    predicate: ({ queryKey }) => queryKeyContains(queryKey, "gmail"),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (oldData: unknown) => {
      if (!hasThreads(oldData)) return oldData;

      const existingThread = oldData.threads.find((item) => item.id === threadId);
      if (!existingThread) return oldData;

      if (existingThread.messageCount <= 1) {
        return {
          ...oldData,
          threads: oldData.threads.filter((item) => item.id !== threadId),
        };
      }

      return {
        ...oldData,
        threads: oldData.threads.map((item) =>
          item.id === threadId ? { ...item, messageCount: item.messageCount - 1 } : item,
        ),
      };
    });
  }
}

function applyGmailRealtimeUpdate(queryClient: QueryClient, payload: unknown) {
  const data = getWebhookData(payload);
  const message = isRecord(data?.message) ? data.message : undefined;
  if (!data || !message) return;

  const eventType = getString(data.type);

  if (eventType === "messageDeleted") {
    patchGmailDeletedMessage(queryClient, message);
    return;
  }

  if (eventType !== "messageReceived" && eventType !== "messageLabelChanged") return;

  const thread = buildThreadFromGmailMessage(message);
  if (thread) patchGmailThreadCollections(queryClient, thread);
}

function toCalendarDateTime(value: unknown) {
  if (!isRecord(value)) return undefined;
  return getString(value.dateTime) ?? getString(value.date);
}

function isCalendarResponseStatus(value: unknown): value is CalendarAttendee["responseStatus"] {
  return (
    value === "accepted" || value === "declined" || value === "tentative" || value === "needsAction"
  );
}

function buildCalendarEvent(rawEvent: JsonRecord, calendarId?: string): CalendarEvent | null {
  const id = getString(rawEvent.id);
  if (!id) return null;

  const startDateTime = toCalendarDateTime(rawEvent.start) ?? new Date().toISOString();
  const endDateTime = toCalendarDateTime(rawEvent.end) ?? startDateTime;
  const start = isRecord(rawEvent.start) ? rawEvent.start : undefined;
  const attendees = getRecordArray(rawEvent.attendees)?.flatMap((attendee) => {
    const email = getString(attendee.email);
    if (!email) return [];

    return [
      {
        email,
        displayName: getString(attendee.displayName),
        responseStatus: isCalendarResponseStatus(attendee.responseStatus)
          ? attendee.responseStatus
          : undefined,
        organizer: typeof attendee.organizer === "boolean" ? attendee.organizer : undefined,
        self: typeof attendee.self === "boolean" ? attendee.self : undefined,
      },
    ];
  });
  const organizer = isRecord(rawEvent.organizer) ? rawEvent.organizer : undefined;

  return {
    id,
    summary: getString(rawEvent.summary) ?? "(no title)",
    description: getString(rawEvent.description),
    location: getString(rawEvent.location),
    startDateTime,
    endDateTime,
    allDay: Boolean(start && getString(start.date) && !getString(start.dateTime)),
    attendees,
    organizerEmail: getString(organizer?.email),
    meetLink: getString(rawEvent.hangoutLink),
    status: getString(rawEvent.status),
    htmlLink: getString(rawEvent.htmlLink),
    colorId: getString(rawEvent.colorId),
    calendarId,
  };
}

function shouldEventBeInList(queryKey: readonly unknown[], event: CalendarEvent) {
  if (!queryKeyIncludes(queryKey, "listEvents")) return false;

  const input = extractQueryInput(queryKey);
  if (!input) return false;

  const queryCalendarId = getString(input.calendarId) ?? "primary";
  if (event.calendarId && queryCalendarId !== event.calendarId) return false;

  const timeMin = getString(input.timeMin);
  const timeMax = getString(input.timeMax);
  if (!timeMin || !timeMax) return false;

  const eventStart = new Date(event.startDateTime).getTime();
  const eventEnd = new Date(event.endDateTime).getTime();
  const rangeStart = new Date(timeMin).getTime();
  const rangeEnd = new Date(timeMax).getTime();

  if (![eventStart, eventEnd, rangeStart, rangeEnd].every(Number.isFinite)) return false;

  return eventEnd >= rangeStart && eventStart <= rangeEnd;
}

function sortEventsByStart(events: CalendarEvent[]) {
  return [...events].sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

function patchCalendarEventCollections(queryClient: QueryClient, event: CalendarEvent) {
  const queries = queryClient.getQueryCache().findAll({
    predicate: ({ queryKey }) => queryKeyContains(queryKey, "calendar"),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (oldData: unknown) => {
      if (!hasEvents(oldData)) return oldData;

      const existingEvent = oldData.events.find((item) => item.id === event.id);
      const shouldInclude = shouldEventBeInList(query.queryKey, event);

      if (!shouldInclude) {
        if (!existingEvent) return oldData;
        return {
          ...oldData,
          events: oldData.events.filter((item) => item.id !== event.id),
        };
      }

      const mergedEvent = existingEvent ? { ...existingEvent, ...event } : event;
      const events = [mergedEvent, ...oldData.events.filter((item) => item.id !== event.id)];

      return {
        ...oldData,
        events: sortEventsByStart(events),
      };
    });
  }
}

function patchCalendarDeletedEvent(queryClient: QueryClient, eventId: string) {
  const queries = queryClient.getQueryCache().findAll({
    predicate: ({ queryKey }) => queryKeyContains(queryKey, "calendar"),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (oldData: unknown) => {
      if (!hasEvents(oldData)) return oldData;
      if (!oldData.events.some((event) => event.id === eventId)) return oldData;

      return {
        ...oldData,
        events: oldData.events.filter((event) => event.id !== eventId),
      };
    });
  }
}

function applyCalendarRealtimeUpdate(queryClient: QueryClient, payload: unknown) {
  const data = getWebhookData(payload);
  if (!data) return;

  const eventType = getString(data.type);

  if (eventType === "eventDeleted") {
    const eventId = getString(data.eventId);
    if (eventId) patchCalendarDeletedEvent(queryClient, eventId);
    return;
  }

  if (eventType !== "eventCreated" && eventType !== "eventUpdated") return;

  const rawEvent = isRecord(data.event) ? data.event : undefined;
  if (!rawEvent) return;

  const event = buildCalendarEvent(rawEvent, getString(data.calendarId));
  if (event) patchCalendarEventCollections(queryClient, event);
}

export function useServerEvents(enabled: boolean) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource("/events/corsair", { withCredentials: true });

    const handleCorsairEvent = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as CorsairRealtimeEvent;

        if (data.plugin === "gmail") {
          applyGmailRealtimeUpdate(queryClient, data.payload);
          void utils.gmail.getConnectionStatus.invalidate();
          void utils.gmail.listThreads.invalidate();
          void utils.gmail.getThread.invalidate();
          void utils.gmail.searchEmails.invalidate();
          queryClient.invalidateQueries({
            predicate: ({ queryKey }) => queryKeyContains(queryKey, "gmail"),
          });
        } else if (data.plugin === "googlecalendar" || data.plugin === "calendar") {
          applyCalendarRealtimeUpdate(queryClient, data.payload);
          void utils.calendar.getConnectionStatus.invalidate();
          void utils.calendar.listEvents.invalidate();
          void utils.calendar.getEvent.invalidate();
          queryClient.invalidateQueries({
            predicate: ({ queryKey }) => queryKeyContains(queryKey, "calendar"),
          });
        }
      } catch (error) {
        console.error("[SSE] Failed to process Corsair event:", error);
      }
    };

    eventSource.addEventListener("corsair", handleCorsairEvent);

    return () => {
      eventSource.removeEventListener("corsair", handleCorsairEvent);
      eventSource.close();
    };
  }, [enabled, queryClient, utils]);
}
