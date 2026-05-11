import type { Doc, Id } from "@wish/convex-backend/data-model";

export function groupRequestsByStatus(requests?: Doc<"requests">[]) {
  return (requests ?? []).reduce<Record<string, Doc<"requests">[]>>((groups, request) => {
    const statusId = request.status.toString();
    if (!groups[statusId]) {
      groups[statusId] = [];
    }
    groups[statusId].push(request);
    return groups;
  }, {});
}

export function getRequestsForStatus(
  groupedRequests: Record<string, Doc<"requests">[]>,
  statusId: Id<"requestStatuses">,
) {
  return groupedRequests[statusId.toString()] ?? [];
}

export function toUpvotedRequestSet(viewerUpvotes?: Id<"requests">[]) {
  return new Set(viewerUpvotes ?? []);
}

export function createMoveRequestToStatus(
  updateStatus: (args: { id: Id<"requests">; status: Id<"requestStatuses"> }) => Promise<unknown>,
) {
  return async function moveRequestToStatus(
    requestId: string,
    statusId: Id<"requestStatuses">,
  ) {
    if (!requestId) {
      return;
    }

    try {
      await updateStatus({ id: requestId as Id<"requests">, status: statusId });
    } catch (error) {
      console.error("Failed to move request", error);
    }
  };
}
