"use client";
import { useQuery } from "convex/react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import type { BoardType } from "#/lib/requestBoard/boardType";
import RequestTable from "../Request/RequestTable";
import RequestKanban from "@components/Request/RequestKanban";

interface Props {
  projectId: Id<"projects">;
  type: BoardType;
}
export default function DashboardBoard({ projectId, type }: Props) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });

  if (!project) return null;

  return (
    <div className="flex h-full gap-2 w-full overflow-x-scroll px-2 md:px-6 p-px">
      {/*gap*/}
      <div className="sidebar-offset-width shrink-0"></div>
      {/*gap*/}
      {type === "kanban" ? (
        <RequestKanban projectId={project._id} />
      ) : (
        <RequestTable projectId={projectId} />
      )}
    </div>
  );
}
