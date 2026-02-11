import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

import DashboardBoard from "@/components/dashboard/DashboardBoard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  const preloadedStatuses = await preloadQuery(api.requestStatuses.getByProject, { id }, { token });
  const preloadedRequests = await preloadQuery(api.requests.getByProject, { id }, { token });

  return (
    <DashboardBoard
      preloadedProject={preloadedProject}
      preloadedStatuses={preloadedStatuses}
      preloadedRequests={preloadedRequests}
    />
  );
}
