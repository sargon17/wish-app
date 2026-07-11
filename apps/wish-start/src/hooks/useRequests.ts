import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wish/convex-backend/api";
import type { Doc, Id } from "@wish/convex-backend/data-model";
import { useMemo } from "react";

export default function useRequests(projectId: Id<"projects">, kind?: "request" | "complaint") {
  const {
    data: requests,
    isPending,
    error,
  } = useQuery(convexQuery(api.requests.getByProject, { id: projectId, kind }));

  const { data: requestsUpvotedByUser } = useQuery(
    convexQuery(api.requestUpvotes.getViewerUpvotesByProject, {
      projectId: projectId,
    }),
  );

  const byId = useMemo(
    () => new Map((requests ?? []).map((request) => [request._id, request])),
    [requests],
  );

  const byStatus = useMemo(
    () =>
      (requests ?? []).reduce((map, request) => {
        map.set(request.status, [...(map.get(request.status) ?? []), request]);
        return map;
      }, new Map<Id<"requestStatuses">, Doc<"requests">[]>()),
    [requests],
  );

  const upvotedByUser = useMemo(
    () => new Set(requestsUpvotedByUser ?? []),
    [requestsUpvotedByUser],
  );

  return {
    value: requests,
    isPending,
    error,
    byId,
    byStatus,
    upvotedByUser,
  };
}
