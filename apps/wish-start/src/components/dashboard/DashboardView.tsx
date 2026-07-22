import useProjects from "#/hooks/useProjects";
import { AlertCircle, FolderPlus } from "lucide-react";

import { CreateProjectButton } from "@/components/project/CreateProjectDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import DashboardProjectCard from "./DashboardProjectCard";

export default function DashboardView() {
  const { projects, isPending, error } = useProjects();

  if (isPending) {
    return (
      <div
        aria-label="Loading projects"
        className="grid grid-cols-1 gap-4 p-px max-md:px-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Projects could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <p>Check your connection and try again.</p>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <FolderPlus />
          <EmptyTitle>Create your first Project</EmptyTitle>
          <EmptyDescription>
            Start a Project Board to collect and organize product requests.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateProjectButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-px max-md:px-2 sm:grid-cols-3 lg:grid-cols-4">
      {projects.map((project) => (
        <DashboardProjectCard project={project} key={project._id} />
      ))}
    </div>
  );
}
