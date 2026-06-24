import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import DashboardHeading from "@/components/dashboard/DashboardHeading";
import Loading from "@/components/Organisms/Loading";
import ProjectComplaints from "@/components/project/ProjectComplaints";
import { Button } from "@/components/ui/button";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/complaints")({
  component: ProjectComplaintsRoute,
});

function ProjectComplaintsRoute() {
  const { projectId, slug } = Route.useParams();
  const { isLoading, isAuthenticated } = useStoreUserEffect();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden">
        <Loading />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden px-6 py-6 text-sm text-muted-foreground">
        Sign in to load complaints.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden">
      <div className="md:px-6 md:pt-6">
        <DashboardHeading
          title={`${slug.replaceAll("-", " ")} complaints`}
          breadcrumbs={[
            { label: "home", url: "/" },
            { label: "dashboard", url: "/dashboard" },
            { label: slug.replaceAll("-", " "), url: `/dashboard/project/${projectId}/${slug}` },
          ]}
          actions={
            <Button className="shrink-0" variant="outline" asChild>
              <Link to="/dashboard/project/$projectId/$slug" params={{ projectId, slug }}>
                <ArrowLeft />
                Request board
              </Link>
            </Button>
          }
        />
      </div>
      <ProjectComplaints projectId={projectId as never} />
    </div>
  );
}
