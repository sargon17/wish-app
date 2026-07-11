export const NOTIFICATION_EVENTS = [
  {
    type: "request.created",
    label: "Request Created",
  },
  {
    type: "complaint.created",
    label: "Complaint Created",
  },
  {
    type: "request.comment_created",
    label: "Request Comment Created",
  },
] as const;

export const DEFAULT_NOTIFICATION_EVENT_TYPES = NOTIFICATION_EVENTS.map((event) => event.type);

export const EVENT_LABELS = Object.fromEntries(
  NOTIFICATION_EVENTS.map((event) => [event.type, event.label]),
) as Record<(typeof NOTIFICATION_EVENTS)[number]["type"], string>;
