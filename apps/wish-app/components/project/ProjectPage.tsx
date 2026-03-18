import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

import DashboardBoard from "@/components/dashboard/DashboardBoard";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { getAuthToken } from "@/lib/auth";

interface Props {
  id: string;
}

export default async function ProjectPage({ id }: Props) {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const projectId = id as Id<"projects">;
  const preloadedProject = await preloadQuery(
    api.projects.getProjectById,
    { id: projectId },
    { token },
  );
  const preloadedStatuses = await preloadQuery(
    api.requestStatuses.getByProject,
    { id: projectId },
    { token },
  );
  const preloadedRequests = await preloadQuery(
    api.requests.getByProject,
    { id: projectId },
    { token },
  );

  return (
    <DashboardBoard
      preloadedProject={preloadedProject}
      preloadedStatuses={preloadedStatuses}
      preloadedRequests={preloadedRequests}
    />
  );
}
