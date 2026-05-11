"use client";
import type { Doc } from "@wish/convex-backend/data-model";
import { trimTo } from "@/lib/text";
import { writeRequestDragPayload } from "@/lib/requestBoard/dragPayload";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../ui/card";

import RequestDetailView from "./DetailView/RequestDeatailView";
import RequestCardActions from "./RequestCardActions";
import RequestUpvoteButton from "./RequestUpvoteButton";

interface Props {
  request: Doc<"requests">;
  upvotedSet: Set<Doc<"requests">["_id"]>;
}

export default function RequestCard({ request, upvotedSet }: Props) {
  const upvoteCount = request.upvoteCount ?? 0;
  const isUpvoted = upvotedSet.has(request._id);

  return (
    <RequestDetailView
      request={request}
      upvotedSet={upvotedSet}
    >
      <Card
        draggable
        onDragStart={(e) => {
          try {
            writeRequestDragPayload(e.dataTransfer, request._id);
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
