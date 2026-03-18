"use client";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import DashboardBoardColumn from "./DashboardBoardColumn";

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

  const upvotedSet = useMemo(() => new Set(viewerUpvotes ?? []), [viewerUpvotes]);

  if (!project) return null;

  const sortedRequests = (() => {
    const response: {
      [key: string]: typeof requests;
    } = {};

    requests &&
      requests.map((r) => {
        if (!response[r.status]) {
          response[r.status] = [];
        }
        return response[r.status]?.push(r);
      });
    return response;
  })();

  return (
    <div className="flex h-full gap-2 w-full overflow-x-scroll px-2 md:px-6 p-px">
      {/*gap*/}
      <div className="sidebar-offset-width shrink-0"></div>
      {/*gap*/}
      {statuses?.map((status) => (
        <DashboardBoardColumn
          key={status._id}
          title={status.displayName}
          requests={sortedRequests[status._id.toString()]}
          projectId={project._id}
          statusId={status._id}
          color={status.color}
          upvotedSet={upvotedSet}
        />
      ))}
    </div>
  );
}
