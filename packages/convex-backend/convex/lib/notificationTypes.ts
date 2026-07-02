import { v } from "convex/values";

import { DEFAULT_NOTIFICATION_EVENT_TYPES, NOTIFICATION_EVENTS } from "./notificationEventTypes";

export { DEFAULT_NOTIFICATION_EVENT_TYPES, EVENT_LABELS, NOTIFICATION_EVENTS } from "./notificationEventTypes";

export const notificationEventTypeValidator = v.union(
  ...NOTIFICATION_EVENTS.map((event) => v.literal(event.type)),
);

export const notificationConnectorKindValidator = v.union(v.literal("telegram"), v.literal("email"));


export function normalizeNotificationEventTypes(values: Array<(typeof DEFAULT_NOTIFICATION_EVENT_TYPES)[number]>) {
  const allowed = new Set(DEFAULT_NOTIFICATION_EVENT_TYPES);
  const normalized = values.filter((value) => allowed.has(value));

  if (normalized.length === 0) {
    return [...DEFAULT_NOTIFICATION_EVENT_TYPES];
  }

  return Array.from(new Set(normalized));
}
