import { Cog, Plus } from "lucide-react";
import { Suspense } from "react";

import DashboardHeading from "@/components/dashboard/DashboardHeading";
import Loading from "@/components/Organisms/Loading";
import ProjectPage from "@/components/project/ProjectPage";
import ProjectSettings from "@/components/project/ProjectSettings";
import RequestCreateEditDialog from "@/components/Request/RequestCreateEditDialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  params: Promise<{
    projectId: string;
    projectTitle: string;
  }>;
}

export default async function Page({ params }: Props) {
  const { projectId, projectTitle } = await params;

  const cleanTitle = projectTitle.replaceAll("_", " ");

  const breadcrumbs = [
    {
      label: "home",
      url: "/",
    },
    {
      label: "dashboard",
      url: "/dashboard",
    },
  ];

  return (
    <>
      <div className="h-[calc(100dvh-8px)] flex flex-col overflow-hidden">
        <div className="md:px-6 md:pt-6">
          <DashboardHeading
            title={cleanTitle}
            actions={
              <ButtonGroup>
                <RequestCreateEditDialog project={projectId as Id<"projects">}>
                  <Button className="shrink-0" variant="outline">
                    <Plus />
                    New Request
                  </Button>
                </RequestCreateEditDialog>

                <ProjectSettings projectID={projectId as Id<"projects">}>
                  <Button variant="outline" className="group/button">
                    <Cog className="group-hover/button:rotate-45 transition-all" />
                  </Button>
                </ProjectSettings>
              </ButtonGroup>
            }
            breadcrumbs={breadcrumbs}
          />
        </div>
        <Suspense fallback={<Loading />}>
          <ProjectPage id={projectId} />
        </Suspense>
      </div>
    </>
  );
}
