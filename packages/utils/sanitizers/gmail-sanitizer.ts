export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

export function sanitizeHeaders(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((header) => {
    if (!isRecord(header)) return [];
    const name = getString(header.name);
    const headerValue = getString(header.value);
    return name || headerValue ? [{ name, value: headerValue }] : [];
  });
}

export function sanitizeGmailMessage(value: unknown) {
  if (!isRecord(value)) return {};

  const payload = isRecord(value.payload) ? value.payload : undefined;
  const headers = sanitizeHeaders(payload?.headers);

  return {
    id: getString(value.id),
    threadId: getString(value.threadId),
    labelIds: getStringArray(value.labelIds),
    snippet: getString(value.snippet),
    historyId: getString(value.historyId),
    internalDate: getString(value.internalDate),
    payload: headers ? { headers } : undefined,
  };
}

export function sanitizeGmailWebhookData(value: unknown) {
  if (!isRecord(value)) return undefined;

  return {
    type: getString(value.type),
    emailAddress: getString(value.emailAddress),
    historyId: getString(value.historyId),
    labelsAdded: getStringArray(value.labelsAdded),
    labelsRemoved: getStringArray(value.labelsRemoved),
    message: sanitizeGmailMessage(value.message),
  };
}
