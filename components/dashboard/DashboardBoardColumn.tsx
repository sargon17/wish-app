"use client";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import RequestCard from "../Request/RequestCard";
import CreateRequestDialog from "../Request/RequestCreateEditDialog";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";

interface Props {
  title: string;
  requests?: Doc<"requests">[];
  projectId: Id<"projects">;
  statusId: Id<"requestStatuses">;
}

export default function DashboardBoardColumn({ title, requests, projectId, statusId }: Props) {
  const updateStatus = useMutation(api.requests.updateStatus);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragDepth = useRef(0);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    if (!isDraggingOver) setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDraggingOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDraggingOver(false);
    const requestId = e.dataTransfer.getData("requestId");
    if (!requestId) return;
    try {
      await updateStatus({ id: requestId as unknown as Id<"requests">, status: statusId });
    } catch (err) {
      console.error("Failed to move request", err);
    } finally {
      setIsDraggingOver(false);
    }
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
        {title}
        <CreateRequestDialog project={projectId} status={statusId}>
          <Button size="icon" variant="ghost">
            +
          </Button>
        </CreateRequestDialog>
      </div>
      <Separator />
      <ScrollArea className="relative h-full flex-1 min-h-0">
        {requests && (
          <div className="flex flex-col gap-2 p-3">
            {requests.map((request) => (
              <RequestCard request={request} key={request._id} />
            ))}
          </div>
        )}

        {isDraggingOver && (
          <div
            className="absolute inset-0 z-10 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30"
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
