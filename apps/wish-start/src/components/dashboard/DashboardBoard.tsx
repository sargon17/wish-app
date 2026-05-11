"use client";
import { useQuery } from "convex/react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import DashboardBoardColumn from "./DashboardBoardColumn";
import { useRequestBoardState } from "@/hooks/useRequestBoardState";

interface Props {
  projectId: Id<"projects">;
}
export default function DashboardBoard({
  projectId,
}: Props) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });
  const statuses = useQuery(api.requestStatuses.getByProject, { id: projectId });
  const requests = useQuery(api.requests.getByProject, { id: projectId });
  const viewerUpvotes = useQuery(
    api.requestUpvotes.getViewerUpvotesByProject,
    project ? { projectId: project._id } : "skip",
  );

  const { getRequestsForStatus, handleRequestDrop, upvotedSet } = useRequestBoardState({
    requests: requests ?? undefined,
    viewerUpvotes: viewerUpvotes ?? undefined,
  });

  if (!project) return null;

  return (
    <div className="flex h-full gap-2 w-full overflow-x-scroll px-2 md:px-6 p-px">
      {/*gap*/}
      <div className="sidebar-offset-width shrink-0"></div>
      {/*gap*/}
      {statuses?.map((status) => (
        <DashboardBoardColumn
          key={status._id}
          title={status.displayName}
          requests={getRequestsForStatus(status._id)}
          projectId={project._id}
          statusId={status._id}
          color={status.color}
          upvotedSet={upvotedSet}
          onDropRequest={handleRequestDrop}
        />
      ))}
    </div>
  );
}
