import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";

import ProjectSettings from "@/components/project/ProjectSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getPortalPublication } from "./portalPublication";

export default function ProjectPortalHeaderAction({ projectId }: { projectId: Id<"projects"> }) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });

  if (!project) {
    return null;
  }

  const publication = getPortalPublication(
    project.projectSlug,
    project.suggestionPortalPublishedAt,
  );

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        variant="outline"
        className={
          publication.isPublished
            ? "border-brand/25 bg-brand/10 text-brand"
            : "text-muted-foreground"
        }
      >
        {publication.label}
      </Badge>
      {publication.isPublished && publication.portalPath ? (
        <Button variant="ghost" size="sm" asChild>
          <a href={publication.portalPath} target="_blank" rel="noreferrer">
            <ExternalLink />
            <span className="max-sm:sr-only">Open portal</span>
          </a>
        </Button>
      ) : (
        <ProjectSettings projectID={projectId}>
          <Button type="button" variant="ghost" size="sm">
            Publish
          </Button>
        </ProjectSettings>
      )}
    </div>
  );
}
