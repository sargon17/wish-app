"use client";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import type { Doc, Id } from "@wish/convex-backend/data-model";

import RequestCard from "../Request/RequestCard";
import CreateRequestDialog from "../Request/RequestCreateEditDialog";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import useRequests from "#/hooks/useRequests";

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
      className=" group/board-column w-90 ring-border bg-card/90 backdrop-blur-lg ring rounded-xl h-full shrink-0 flex flex-col relative overflow-hidden"
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
    >
      <div className="flex justify-between items-center font-semibold p-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: color }} />
          {displayName}
        </div>
        <CreateRequestDialog project={projectId} status={statusId}>
          <Button size="icon" variant="ghost">
            +
          </Button>
        </CreateRequestDialog>
      </div>
      <Separator />
      <ScrollArea className="relative h-full flex-1 min-h-0">
        {requestsByStatus && (
          <div className="flex flex-col gap-2 p-3">
            {requestsByStatus.map((request) => (
              <RequestCard request={request} key={request._id} />
            ))}
          </div>
        )}

        {isDraggingOver && (
          <div
            className="absolute inset-0 z-10 rounded-3xl border border-dashed flex items-center justify-center text-xs text-muted-foreground border-accent-foreground bg-foreground/1 m-1"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            Drop here to move
          </div>
        )}

        <div className="w-full flex justify-center opacity-0 group-hover/board-column:opacity-100 transition-opacity p-3">
          <CreateRequestDialog project={projectId} status={statusId}>
            <Button size="icon" variant="ghost">
              +
            </Button>
          </CreateRequestDialog>
        </div>
      </ScrollArea>
    </div>
  );
}
