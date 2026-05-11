import { describe, expect, it, vi } from "vite-plus/test";

import type { Doc, Id } from "@wish/convex-backend/data-model";

import {
  createMoveRequestToStatus,
  groupRequestsByStatus,
  getRequestsForStatus,
  toUpvotedRequestSet,
} from "../boardState";

describe("requestBoard boardState", () => {
  it("groups requests by status and resolves column requests", () => {
    const statusA = "status-a" as Id<"requestStatuses">;
    const statusB = "status-b" as Id<"requestStatuses">;
    const requests = [
      { _id: "request-1", status: statusA },
      { _id: "request-2", status: statusB },
      { _id: "request-3", status: statusA },
    ] as Doc<"requests">[];

    const grouped = groupRequestsByStatus(requests);

    expect(getRequestsForStatus(grouped, statusA).map((request) => request._id)).toEqual([
      "request-1",
      "request-3",
    ]);
    expect(getRequestsForStatus(grouped, statusB).map((request) => request._id)).toEqual([
      "request-2",
    ]);
    expect(getRequestsForStatus(grouped, "missing" as Id<"requestStatuses">)).toEqual([]);
  });

  it("creates a stable upvote set", () => {
    const requestId = "request-1" as Id<"requests">;
    const set = toUpvotedRequestSet([requestId]);

    expect(set.has(requestId)).toBe(true);
    expect(set.has("request-2" as Id<"requests">)).toBe(false);
  });

  it("guards empty moves and forwards valid moves", async () => {
    const updateStatus = vi.fn().mockResolvedValue(undefined);
    const moveRequestToStatus = createMoveRequestToStatus(updateStatus);
    const statusId = "status-a" as Id<"requestStatuses">;

    await moveRequestToStatus("", statusId);
    expect(updateStatus).not.toHaveBeenCalled();

    await moveRequestToStatus("request-1", statusId);
    expect(updateStatus).toHaveBeenCalledWith({
      id: "request-1" as Id<"requests">,
      status: statusId,
    });
  });
});
