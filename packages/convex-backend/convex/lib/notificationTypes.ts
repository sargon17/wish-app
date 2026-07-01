import { v } from "convex/values";

export const notificationEventTypeValidator = v.union(
  v.literal("request.created"),
  v.literal("complaint.created"),
  v.literal("request.comment_created"),
  v.literal("complaint.case_event_created"),
);

export const notificationConnectorKindValidator = v.union(v.literal("telegram"), v.literal("email"));

export const DEFAULT_NOTIFICATION_EVENT_TYPES = [
  "request.created",
  "complaint.created",
  "request.comment_created",
  "complaint.case_event_created",
] as const;

export function normalizeNotificationEventTypes(values: Array<(typeof DEFAULT_NOTIFICATION_EVENT_TYPES)[number]>) {
  const allowed = new Set(DEFAULT_NOTIFICATION_EVENT_TYPES);
  const normalized = values.filter((value) => allowed.has(value));

  if (normalized.length === 0) {
    return [...DEFAULT_NOTIFICATION_EVENT_TYPES];
  }

  return Array.from(new Set(normalized));
}
