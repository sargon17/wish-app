"use client";
import type { Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";

import { usePreloadedQuery } from "convex/react";
import DashboardBoardColumn from "./DashboardBoardColumn";

interface Props {
  preloadedProject: Preloaded<typeof api.projects.getProjectById>;
  preloadedStatuses: Preloaded<typeof api.requestStatuses.getByProject>;
  preloadedRequests: Preloaded<typeof api.requests.getByProject>;
}
export default function DashboardBoard({
  preloadedProject,
  preloadedRequests,
  preloadedStatuses,
}: Props) {
  const project = usePreloadedQuery(preloadedProject);
  const statuses = usePreloadedQuery(preloadedStatuses);
  const requests = usePreloadedQuery(preloadedRequests);

  if (!project) return;

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
        />
      ))}
    </div>
  );
}
