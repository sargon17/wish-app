"use client";
import useRequests from "#/hooks/useRequests";
import type { Doc, Id } from "@wish/convex-backend/data-model";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import RequestCard from "../Request/RequestCard";
import RequestCreateEditDialog from "../Request/RequestCreateEditDialog";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface Props {
  status: Doc<"requestStatuses">;
  projectId: Id<"projects">;
  kind?: "request" | "complaint";
  onDropRequest: (event: DragEvent<HTMLDivElement>, statusId: Id<"requestStatuses">) => void;
}

export default function DashboardBoardColumn({ status, projectId, kind, onDropRequest }: Props) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const requests = useRequests(projectId, kind);
  const dragDepth = useRef(0);
  const { _id: statusId, color, displayName } = status;
  const requestsByStatus = requests.byStatus.get(statusId);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    if (!isDraggingOver) setIsDraggingOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDraggingOver(false);
    onDropRequest(e, status._id);
  }
  return (
    <div
      className=" group/board-column relative flex h-full w-90 shrink-0 flex-col overflow-hidden rounded-xl bg-card/90 ring ring-border backdrop-blur-lg"
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
    >
      <div className="flex items-center justify-between p-3 font-semibold">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-xs" style={{ backgroundColor: color }} />
          {displayName}
        </div>
        <RequestCreateEditDialog project={projectId} status={statusId}>
          <Button size="icon" variant="ghost" aria-label={`Add request to ${displayName}`}>
            +
          </Button>
        </RequestCreateEditDialog>
      </div>
      <Separator />
      <ScrollArea className="relative h-full min-h-0 flex-1">
        {requestsByStatus && (
          <div className="flex flex-col gap-2 p-3">
            {requestsByStatus.map((request) => (
              <RequestCard request={request} key={request._id} />
            ))}
          </div>
        )}

        {isDraggingOver && (
          <div
            className="absolute inset-0 z-10 m-1 flex items-center justify-center rounded-3xl border border-dashed border-accent-foreground bg-foreground/1 text-xs text-muted-foreground"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            Drop here to move
          </div>
        )}

        <div className="flex w-full justify-center p-3">
          <RequestCreateEditDialog project={projectId} status={statusId}>
            <Button size="icon" variant="ghost" aria-label={`Add request to ${displayName}`}>
              +
            </Button>
          </RequestCreateEditDialog>
        </div>
      </ScrollArea>
    </div>
  );
}
