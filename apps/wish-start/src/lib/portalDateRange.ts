const PORTAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizePortalDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const match = PORTAL_DATE_PATTERN.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return value;
}

export function normalizePortalDateRange(from: unknown, to: unknown) {
  const normalizedFrom = normalizePortalDate(from);
  const normalizedTo = normalizePortalDate(to);

  if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
    return { from: normalizedTo, to: normalizedFrom };
  }

  return { from: normalizedFrom, to: normalizedTo };
}
