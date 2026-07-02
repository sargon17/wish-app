import { v } from "convex/values";

import { NOTIFICATION_EVENTS } from "./notificationEventTypes";

export const notificationEventTypeValidator = v.union(
  ...NOTIFICATION_EVENTS.map((event) => v.literal(event.type)),
);

// ponytail: only telegram ships today; widen to a union when a second connector exists.
export const notificationConnectorKindValidator = v.literal("telegram");
