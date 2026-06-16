import { isRecord, getString } from "./gmail-sanitizer";

export function sanitizeCalendarDateTime(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    date: getString(value.date),
    dateTime: getString(value.dateTime),
    timeZone: getString(value.timeZone),
  };
}

export function sanitizeCalendarAttendees(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((attendee) => {
    if (!isRecord(attendee)) return [];
    const email = getString(attendee.email);
    if (!email) return [];

    return [
      {
        email,
        displayName: getString(attendee.displayName),
        organizer: typeof attendee.organizer === "boolean" ? attendee.organizer : undefined,
        self: typeof attendee.self === "boolean" ? attendee.self : undefined,
        responseStatus: getString(attendee.responseStatus),
      },
    ];
  });
}

export function sanitizeCalendarOrganizer(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    email: getString(value.email),
    displayName: getString(value.displayName),
    self: typeof value.self === "boolean" ? value.self : undefined,
  };
}

export function sanitizeCalendarEvent(value: unknown) {
  if (!isRecord(value)) return {};

  return {
    id: getString(value.id),
    status: getString(value.status),
    htmlLink: getString(value.htmlLink),
    summary: getString(value.summary),
    description: getString(value.description),
    location: getString(value.location),
    colorId: getString(value.colorId),
    organizer: sanitizeCalendarOrganizer(value.organizer),
    start: sanitizeCalendarDateTime(value.start),
    end: sanitizeCalendarDateTime(value.end),
    attendees: sanitizeCalendarAttendees(value.attendees),
    hangoutLink: getString(value.hangoutLink),
  };
}

export function sanitizeCalendarWebhookData(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    type: getString(value.type),
    calendarId: getString(value.calendarId),
    eventId: getString(value.eventId),
    timestamp: getString(value.timestamp),
    event: sanitizeCalendarEvent(value.event),
  };
}
