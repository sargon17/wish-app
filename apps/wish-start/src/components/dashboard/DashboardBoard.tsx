"use client";
import type { BoardType } from "#/lib/requestBoard/boardType";
import RequestKanban from "@components/Request/RequestKanban";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";

import RequestDeepLink from "../Request/DetailView/RequestDeepLink";
import RequestTable from "../Request/RequestTable";

interface Props {
  projectId: Id<"projects">;
  boardType: BoardType;
  kind?: "request" | "complaint";
  itemId?: string;
}
export default function DashboardBoard({ projectId, boardType, kind, itemId }: Props) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });

  if (!project) return null;

  return (
    <div
      className={
        boardType === "kanban"
          ? "flex h-full w-full max-w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pt-px pr-2 sidebar-offset-pl md:pr-6"
          : "flex h-full w-full max-w-full min-w-0 gap-2 pt-px pr-2 sidebar-offset-pl md:pr-6"
      }
    >
      {itemId ? <RequestDeepLink projectId={projectId} kind={kind} itemId={itemId} /> : null}
      {boardType === "kanban" ? (
        <RequestKanban projectId={project._id} kind={kind} />
      ) : (
        <RequestTable key={`${projectId}:${kind ?? "request"}`} projectId={projectId} kind={kind} />
      )}
    </div>
  );
}
