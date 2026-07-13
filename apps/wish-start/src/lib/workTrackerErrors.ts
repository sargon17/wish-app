import {
  handoffCreationDisabledError,
  unresolvedWorkItemHandoffError,
  workTrackerConnectionNeedsAttentionError,
} from "@wish/convex-backend/work-tracker-errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getWorkTrackerError(error: unknown) {
  if (!isRecord(error) || !isRecord(error.data)) return null;
  if (error.data.code === unresolvedWorkItemHandoffError.code) {
    return unresolvedWorkItemHandoffError;
  }
  if (error.data.code === handoffCreationDisabledError.code) {
    return handoffCreationDisabledError;
  }
  if (error.data.code === workTrackerConnectionNeedsAttentionError.code) {
    return workTrackerConnectionNeedsAttentionError;
  }
  return null;
}
