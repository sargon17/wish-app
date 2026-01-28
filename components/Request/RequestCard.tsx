"use client";
import type { Doc } from "@/convex/_generated/dataModel";
import { trimTo } from "@/lib/text";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../ui/card";

import RequestDetailView from "./DetailView/RequestDeatailView";
import RequestCardActions from "./RequestCardActions";
import RequestUpvoteButton from "./RequestUpvoteButton";

interface Props {
  request: Doc<"requests">;
  isUpvoted: boolean;
}

export default function RequestCard({ request, isUpvoted }: Props) {
  const upvoteCount = request.upvoteCount ?? 0;

  return (
    <RequestDetailView request={request} isUpvoted={isUpvoted} upvoteCount={upvoteCount}>
      <Card
        draggable
        onDragStart={(e) => {
          try {
            const id = request._id as unknown as string;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("requestId", id);
            e.dataTransfer.setData("text/plain", id);
          } catch {
            // noop
          }
        }}
        className="w-full relative group/request-card"
        key={request._id}
        data-request={request._id}
      >
        <CardHeader>
          <CardTitle className=" capitalize">{request.text}</CardTitle>
          <CardAction className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <RequestCardActions request={request} />
            <RequestUpvoteButton
              requestId={request._id}
              projectId={request.project}
              upvoteCount={upvoteCount}
              isUpvoted={isUpvoted}
            />
          </CardAction>
        </CardHeader>
        {request.description && (
          <CardContent>
            <p className="text-secondary-foreground text-sm">
              {trimTo({ text: request.description })}
            </p>
          </CardContent>
        )}
      </Card>
    </RequestDetailView>
  );
}
