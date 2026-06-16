// data-factories to unify data parsing and sanitization for Gmail and Calendar

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

// ─── Gmail Factory ──────────────────────────────────────────────────────────

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface ParsedMessage {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  snippet: string;
  body: string;
  isHtml?: boolean;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  labels: string[];
}

export class GmailFactory {
  static parseEmailAddress(headerVal?: string): EmailAddress {
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

  static parseEmailAddresses(headerVal?: string): EmailAddress[] {
    if (!headerVal) return [];
    // Split by commas, but ignore commas inside quotes
    const addresses = headerVal.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    return addresses.map((addr) => this.parseEmailAddress(addr));
  }

  static extractBody(part?: any): { html?: string; text?: string } {
    if (!part) return {};

    const bodyData = part.body?.data;
    let decoded = "";
    if (bodyData) {
      try {
        decoded = Buffer.from(bodyData, "base64url").toString("utf-8");
      } catch {}
    }

    const mimeType = part.mimeType?.toLowerCase();

    if (mimeType === "text/html" && decoded) {
      return { html: decoded };
    }
    if (mimeType === "text/plain" && decoded) {
      return { text: decoded };
    }

    let html: string | undefined;
    let text: string | undefined;

    if (part.parts) {
      for (const subPart of part.parts) {
        const res = this.extractBody(subPart);
        if (res.html) html = res.html;
        if (res.text) text = res.text;
      }
    }

    return { html, text };
  }

  static getBody(part?: any): string {
    const { html, text } = this.extractBody(part);
    return html || text || "";
  }

  static decodeHtmlEntities(text: string): string {
    if (!text) return "";
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'");
  }

  static parseMessage(msg: any): ParsedMessage {
    const headers = (msg.payload?.headers as { name?: string; value?: string }[]) ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const { html, text } = this.extractBody(msg.payload);
    const body = html || text || msg.snippet || "";
    const isHtml = !!html;

    return {
      id: String(msg.id ?? ""),
      threadId: String(msg.threadId ?? ""),
      from: this.parseEmailAddress(getHeader("from")),
      to: this.parseEmailAddresses(getHeader("to")),
      cc: getHeader("cc") ? this.parseEmailAddresses(getHeader("cc")) : undefined,
      subject: this.decodeHtmlEntities(getHeader("subject") ?? "(no subject)"),
      snippet: this.decodeHtmlEntities(String(msg.snippet ?? "")),
      body,
      isHtml,
      isRead: !(msg.labelIds ?? []).includes("UNREAD"),
      isStarred: (msg.labelIds ?? []).includes("STARRED"),
      receivedAt: msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString(),
      labels: (msg.labelIds as string[]) ?? [],
    };
  }

  // Sanitize message from webhook payload
  static sanitizeWebhookMessage(value: unknown) {
    if (!isRecord(value)) return {};

    const payload = isRecord(value.payload) ? value.payload : undefined;
    const rawHeaders = payload?.headers;
    let sanitizedHeaders: { name?: string; value?: string }[] | undefined;

    if (Array.isArray(rawHeaders)) {
      sanitizedHeaders = rawHeaders.flatMap((header) => {
        if (!isRecord(header)) return [];
        const name = getString(header.name);
        const headerValue = getString(header.value);
        return name || headerValue ? [{ name, value: headerValue }] : [];
      });
    }

    return {
      id: getString(value.id),
      threadId: getString(value.threadId),
      labelIds: getStringArray(value.labelIds),
      snippet: getString(value.snippet),
      historyId: getString(value.historyId),
      internalDate: getString(value.internalDate),
      payload: sanitizedHeaders ? { headers: sanitizedHeaders } : undefined,
    };
  }

  static sanitizeWebhookData(value: unknown) {
    if (!isRecord(value)) return undefined;

    return {
      type: getString(value.type),
      emailAddress: getString(value.emailAddress),
      historyId: getString(value.historyId),
      labelsAdded: getStringArray(value.labelsAdded),
      labelsRemoved: getStringArray(value.labelsRemoved),
      message: this.sanitizeWebhookMessage(value.message),
    };
  }
}

// ─── Calendar Factory ────────────────────────────────────────────────────────

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
  organizer?: boolean;
  self?: boolean;
}

export interface ParsedCalendarEvent {
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
}

export class CalendarFactory {
  static parseEvent(e: any, calendarId: string = "primary"): ParsedCalendarEvent {
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
      attendees: (e.attendees as CalendarAttendee[]) ?? [],
      organizerEmail: (e.organizer as Record<string, string>)?.email ?? undefined,
      meetLink: e.hangoutLink ? String(e.hangoutLink) : undefined,
      status: e.status ? String(e.status) : undefined,
      htmlLink: e.htmlLink ? String(e.htmlLink) : undefined,
      colorId: e.colorId ? String(e.colorId) : undefined,
      calendarId,
    };
  }

  static sanitizeDateTime(value: unknown) {
    if (!isRecord(value)) return undefined;
    return {
      date: getString(value.date),
      dateTime: getString(value.dateTime),
      timeZone: getString(value.timeZone),
    };
  }

  static sanitizeAttendees(value: unknown): CalendarAttendee[] | undefined {
    if (!Array.isArray(value)) return undefined;

    return value.flatMap((attendee) => {
      if (!isRecord(attendee)) return [];
      const email = getString(attendee.email);
      if (!email) return [];

      const status = getString(attendee.responseStatus);
      const typedStatus = (
        ["accepted", "declined", "tentative", "needsAction"].includes(status ?? "")
          ? status
          : undefined
      ) as CalendarAttendee["responseStatus"];

      return [
        {
          email,
          displayName: getString(attendee.displayName),
          organizer: typeof attendee.organizer === "boolean" ? attendee.organizer : undefined,
          self: typeof attendee.self === "boolean" ? attendee.self : undefined,
          responseStatus: typedStatus,
        },
      ];
    });
  }

  static sanitizeOrganizer(value: unknown) {
    if (!isRecord(value)) return undefined;
    return {
      email: getString(value.email),
      displayName: getString(value.displayName),
      self: typeof value.self === "boolean" ? value.self : undefined,
    };
  }

  static sanitizeEvent(value: unknown) {
    if (!isRecord(value)) return {};

    return {
      id: getString(value.id),
      status: getString(value.status),
      htmlLink: getString(value.htmlLink),
      summary: getString(value.summary),
      description: getString(value.description),
      location: getString(value.location),
      colorId: getString(value.colorId),
      organizer: this.sanitizeOrganizer(value.organizer),
      start: this.sanitizeDateTime(value.start),
      end: this.sanitizeDateTime(value.end),
      attendees: this.sanitizeAttendees(value.attendees),
      hangoutLink: getString(value.hangoutLink),
    };
  }

  static sanitizeWebhookData(value: unknown) {
    if (!isRecord(value)) return undefined;

    return {
      type: getString(value.type),
      calendarId: getString(value.calendarId),
      eventId: getString(value.eventId),
      timestamp: getString(value.timestamp),
      event: this.sanitizeEvent(value.event),
    };
  }
}
