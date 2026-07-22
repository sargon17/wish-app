"use client";
import useRequests from "#/hooks/useRequests";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";

import { writeRequestDragPayload } from "@/lib/requestBoard/dragPayload";
import { trimTo } from "@/lib/text";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../ui/card";

import RequestDetailView from "./DetailView/RequestDeatailView";
import RequestCardActions from "./RequestCardActions";
import RequestUpvoteButton from "./RequestUpvoteButton";

interface Props {
  request: Doc<"requests">;
  showUpvoteButton?: boolean;
}

export default function RequestCard({ request, showUpvoteButton = true }: Props) {
  const upvoteCount = request.upvoteCount ?? 0;
  const requests = useRequests(request.project);
  const statuses = useQuery(api.requestStatuses.getByProject, {
    id: request.project,
  });

  return (
    <RequestDetailView request={request} showUpvoteButton={showUpvoteButton}>
      <Card
        draggable
        onDragStart={(e) => {
          try {
            writeRequestDragPayload(e.dataTransfer, request._id);
          } catch {
            // noop
          }
        }}
        className="group/request-card relative w-full"
        key={request._id}
        data-request={request._id}
      >
        <CardHeader>
          <CardTitle className=" capitalize">{request.text}</CardTitle>
          <CardAction className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <RequestCardActions request={request} statuses={statuses} />
            {showUpvoteButton ? (
              <RequestUpvoteButton
                requestId={request._id}
                projectId={request.project}
                upvoteCount={upvoteCount}
                isUpvoted={requests.upvotedByUser.has(request._id)}
              />
            ) : null}
          </CardAction>
        </CardHeader>
        {request.description && (
          <CardContent>
            <p className="text-sm text-secondary-foreground">{trimTo(request.description)}</p>
          </CardContent>
        )}
      </Card>
    </RequestDetailView>
  );
}
