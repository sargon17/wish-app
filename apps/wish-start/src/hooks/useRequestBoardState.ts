"use client";

import { useMutation } from "convex/react";
import { useMemo } from "react";
import type { DragEvent } from "react";

import { api } from "@wish/convex-backend/api";
import type { Doc, Id } from "@wish/convex-backend/data-model";

import { readRequestDragPayload } from "@/lib/requestBoard/dragPayload";
import {
  createMoveRequestToStatus,
  groupRequestsByStatus,
  getRequestsForStatus,
  toUpvotedRequestSet,
} from "@/lib/requestBoard/boardState";

export function useRequestBoardState({
  requests,
  viewerUpvotes,
}: {
  requests?: Doc<"requests">[];
  viewerUpvotes?: Id<"requests">[];
}) {
  const updateStatus = useMutation(api.requests.updateStatus);
  const groupedRequests = useMemo(() => groupRequestsByStatus(requests), [requests]);
  const upvotedSet = useMemo(() => toUpvotedRequestSet(viewerUpvotes), [viewerUpvotes]);
  const moveRequestToStatus = useMemo(
    () => createMoveRequestToStatus(updateStatus),
    [updateStatus],
  );

  function handleRequestDrop(event: DragEvent<HTMLDivElement>, statusId: Id<"requestStatuses">) {
    event.preventDefault();
    const requestId = readRequestDragPayload(event.dataTransfer);
    if (!requestId) {
      return;
    }

    void moveRequestToStatus(requestId, statusId);
  }

  return {
    groupedRequests,
    getRequestsForStatus: (statusId: Id<"requestStatuses">) =>
      getRequestsForStatus(groupedRequests, statusId),
    handleRequestDrop,
    moveRequestToStatus,
    upvotedSet,
  };
}
