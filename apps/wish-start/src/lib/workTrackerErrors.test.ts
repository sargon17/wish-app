import {
  handoffCreationDisabledError,
  unresolvedWorkItemHandoffError,
  workTrackerConnectionNeedsAttentionError,
} from "@wish/convex-backend/work-tracker-errors";
import { describe, expect, it } from "vite-plus/test";

import { getWorkTrackerError } from "./workTrackerErrors";

describe("Work Tracker errors", () => {
  it("maps the unresolved Handoff code without relying on an Error message", () => {
    expect(
      getWorkTrackerError({
        data: { code: unresolvedWorkItemHandoffError.code },
      }),
    ).toEqual(unresolvedWorkItemHandoffError);
    expect(
      getWorkTrackerError({ data: { code: handoffCreationDisabledError.code } }),
    ).toEqual(handoffCreationDisabledError);
    expect(
      getWorkTrackerError({ data: { code: workTrackerConnectionNeedsAttentionError.code } }),
    ).toEqual(workTrackerConnectionNeedsAttentionError);
    expect(
      getWorkTrackerError(new Error("Work Item Handoff is unresolved")),
    ).toBeNull();
    expect(getWorkTrackerError({ data: { code: "UNKNOWN" } })).toBeNull();
  });
});
