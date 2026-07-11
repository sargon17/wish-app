import { api } from "@wish/convex-backend/api";
import type { Doc, Id } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";
import { useMemo } from "react";

export default function useRequests(projectId: Id<"projects">, kind?: "request" | "complaint") {
  const requests = useQuery(api.requests.getByProject, { id: projectId, kind });
  const requestsUpvotedByUser = useQuery(api.requestUpvotes.getViewerUpvotesByProject, {
    projectId: projectId,
  });

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
    byId,
    byStatus,
    upvotedByUser,
  };
}
