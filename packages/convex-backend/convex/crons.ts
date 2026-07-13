import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "revoke abandoned Linear setups",
  { minutes: 5 },
  internal.linearWorkTrackerCleanup.cleanupExpiredLinearSetupsInternal,
  {},
);

crons.interval(
  "retry replaced Linear credential revocations",
  { minutes: 5 },
  internal.linearWorkTrackerCleanup.cleanupPendingLinearRevocationsInternal,
  {},
);

export default crons;
