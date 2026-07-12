import DashboardPage from "@components/dashboard/DashboardPage";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import ProjectChangelogManager from "@/components/project/ProjectChangelogManager";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/changelog")({
  component: ProjectChangelogView,
});

function ProjectChangelogView() {
  const { projectId, slug } = Route.useParams();
  const [newEntryTrigger, setNewEntryTrigger] = useState(0);

  return (
    <DashboardPage
      title="Changelog"
      breadcrumbs={[
        { url: `/dashboard/project/${projectId}`, label: "Project" },
        { url: `/dashboard/project/${projectId}/${slug}`, label: slug },
      ]}
      actions={
        <Button type="button" onClick={() => setNewEntryTrigger((value) => value + 1)}>
          <Plus className="h-4 w-4" />
          New entry
        </Button>
      }
    >
      <ProjectChangelogManager projectId={projectId as never} newEntryTrigger={newEntryTrigger} />
    </DashboardPage>
  );
}
