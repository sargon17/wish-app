import { createFileRoute } from "@tanstack/react-router";

import ProjectComplaints from "@/components/project/ProjectComplaints";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/complaints")({
  component: ProjectComplaintsRoute,
});

function ProjectComplaintsRoute() {
  const { projectId } = Route.useParams();

  return <ProjectComplaints projectId={projectId as never} />;
}
