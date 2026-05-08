import { describe, expect, it } from "vitest";

import type { Doc } from "@wish/convex-backend/data-model";

import { findNextStatus } from "../findNextStatus";

describe("findNextStatus", () => {
  it("returns the next status in order", () => {
    const statuses = [
      { _id: "status-1" },
      { _id: "status-2" },
      { _id: "status-3" },
    ] as Doc<"requestStatuses">[];

    expect(findNextStatus({ current: statuses[0], statuses })).toBe(statuses[1]);
  });

  it("returns the current status when already at the end", () => {
    const statuses = [
      { _id: "status-1" },
      { _id: "status-2" },
    ] as Doc<"requestStatuses">[];

    expect(findNextStatus({ current: statuses[1], statuses })).toBe(statuses[1]);
  });
});
