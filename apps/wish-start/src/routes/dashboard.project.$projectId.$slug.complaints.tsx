import { createFileRoute } from "@tanstack/react-router";

import ProjectComplaints from "@/components/project/ProjectComplaints";
import ProjectViewHeading from "@/components/project/ProjectViewHeading";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/complaints")({
  component: ProjectComplaintsRoute,
});

function ProjectComplaintsRoute() {
  const { projectId, slug } = Route.useParams();

  return (
    <>
      <ProjectViewHeading projectId={projectId} slug={slug} title="Complaints" />
      <div className="min-h-0 flex-1">
        <ProjectComplaints projectId={projectId as never} />
      </div>
    </>
  );
}
