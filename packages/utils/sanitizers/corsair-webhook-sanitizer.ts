import { isRecord, getString, sanitizeGmailWebhookData } from "./gmail-sanitizer";
import { sanitizeCalendarWebhookData } from "./calendar-sanitizer";

export function sanitizeCorsairWebhookPayload(plugin: string | null, response: unknown) {
  if (!isRecord(response)) return undefined;

  const data =
    plugin === "gmail"
      ? sanitizeGmailWebhookData(response.data)
      : plugin === "googlecalendar" || plugin === "calendar"
        ? sanitizeCalendarWebhookData(response.data)
        : undefined;

  return {
    success: response.success === true,
    corsairEntityId: getString(response.corsairEntityId),
    data,
  };
}
