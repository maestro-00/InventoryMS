const UTC_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isUtcInstant(value: string): boolean {
  return UTC_INSTANT.test(value);
}

export function toUtcInstant(value: string): string {
  if (!isUtcInstant(value)) {
    throw new Error("Timestamps must be UTC instants with a Z or offset");
  }
  return value;
}

export function formatOccurredAt(occurredAt: string, locale = "en-GH"): string {
  return formatInstant(toUtcInstant(occurredAt), locale, "Occurred");
}

export function formatCreatedAt(createdAt: string, locale = "en-GH"): string {
  return formatInstant(toUtcInstant(createdAt), locale, "Recorded");
}

function formatInstant(value: string, locale: string, label: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
  return `${label} ${formatted}`;
}
