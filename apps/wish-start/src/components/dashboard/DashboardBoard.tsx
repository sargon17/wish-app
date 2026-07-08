"use client";
import { useQuery } from "convex/react";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import type { BoardType } from "#/lib/requestBoard/boardType";
import RequestTable from "../Request/RequestTable";
import RequestKanban from "@components/Request/RequestKanban";

interface Props {
  projectId: Id<"projects">;
  boardType: BoardType;
}
export default function DashboardBoard({ projectId, boardType }: Props) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });

  if (!project) return null;

  return (
    // <div className="sidebar-offset-pl h-full">
    <div className="flex h-full gap-2 w-full overflow-x-scroll pt-px sidebar-offset-pl pr-6 ">
      {boardType === "kanban" ? (
        <RequestKanban projectId={project._id} />
      ) : (
        <RequestTable projectId={projectId} />
      )}
    </div>
    // </div>
  );
}
