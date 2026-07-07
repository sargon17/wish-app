"use client";

import { useMutation } from "convex/react";
import type { DragEvent } from "react";
import { useMemo } from "react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import { createMoveRequestToStatus } from "@/lib/requestBoard/boardState";
import { readRequestDragPayload } from "@/lib/requestBoard/dragPayload";

export function useRequestBoardState() {
  const updateStatus = useMutation(api.requests.updateStatus);

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
    handleRequestDrop,
    moveRequestToStatus,
  };
}
