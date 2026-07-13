export const unresolvedWorkItemHandoffError = {
  code: "WORK_ITEM_HANDOFF_UNRESOLVED",
  message: "Wait for the unresolved Work Tracker delivery check to finish.",
} as const;

export const handoffCreationDisabledError = {
  code: "WORK_ITEM_HANDOFF_CREATION_DISABLED",
  message: "Work Tracker delivery is temporarily disabled",
} as const;

export const workTrackerConnectionNeedsAttentionError = {
  code: "WORK_TRACKER_CONNECTION_NEEDS_ATTENTION",
  message: "Fix the Work Tracker connection before sending",
} as const;
