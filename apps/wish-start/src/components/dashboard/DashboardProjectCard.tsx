import { Link } from "@tanstack/react-router";
import type { Doc } from "@wish/convex-backend/data-model";
import { ExternalLink, Settings } from "lucide-react";

import CopyButton from "@/components/Organisms/CopyButton";
import ProjectSettings from "@/components/project/ProjectSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { sluggedText } from "@/lib/slug";

import DashboardProjectCardActions from "./DashboardProjectCardActions";
import { getPortalPublication } from "./portalPublication";

export default function DashboardProjectCard({ project }: { project: Doc<"projects"> }) {
  const publication = getPortalPublication(
    project.projectSlug,
    project.suggestionPortalPublishedAt,
  );
  const portalUrl =
    typeof window === "undefined" || !publication.portalPath
      ? (publication.portalPath ?? "")
      : `${window.location.origin}${publication.portalPath}`;

  return (
    <Card className="group/card relative w-full" key={project._id}>
      <Link
        to="/dashboard/project/$projectId/$slug"
        params={{ projectId: project._id, slug: sluggedText(project.title) }}
        className="absolute inset-0 z-0"
        aria-label={`Open ${project.title} Project Board`}
      />
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 pr-2">
          <span className="truncate capitalize">{project.title}</span>
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
        </CardTitle>
        <CardAction>
          <DashboardProjectCardActions id={project._id} />
        </CardAction>
      </CardHeader>
      <CardFooter className="relative z-10 justify-end gap-1 bg-muted/30 py-2.5">
        {publication.isPublished && publication.portalPath ? (
          <>
            <CopyButton text={portalUrl} className="w-auto px-2">
              Copy link
            </CopyButton>
            <Button variant="ghost" size="sm" asChild>
              <a href={publication.portalPath} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open portal
              </a>
            </Button>
          </>
        ) : (
          <ProjectSettings projectID={project._id}>
            <Button type="button" variant="ghost" size="sm">
              <Settings />
              Publish portal
            </Button>
          </ProjectSettings>
        )}
      </CardFooter>
    </Card>
  );
}
