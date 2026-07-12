import { Link } from "@tanstack/react-router";
import type { Doc } from "@wish/convex-backend/data-model";

import CopyButton from "@/components/Organisms/CopyButton";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sluggedText } from "@/lib/slug";

import DashboardProjectCardActions from "./DashboardProjectCardActions";

export default function DashboardProjectCard({ project }: { project: Doc<"projects"> }) {
  return (
    <Card className="group/card relative w-full" key={project._id}>
      <Link
        to="/dashboard/project/$projectId/$slug"
        params={{ projectId: project._id, slug: sluggedText(project.title) }}
        className="absolute inset-0 z-0"
      />
      <CardHeader>
        <CardTitle className="capitalize">{project.title}</CardTitle>
        <div className="group/description flex items-center gap-2 overflow-hidden">
          <CardDescription
            className="overflow-hidden text-nowrap text-ellipsis"
            onClick={(event) => event.stopPropagation()}
          >
            {`ID: ${project._id}`}
          </CardDescription>
          <CopyButton
            text={project._id}
            className="opacity-0 group-hover/description:opacity-100"
          />
        </div>
        <CardAction className="opacity-0 group-hover/card:opacity-100">
          <DashboardProjectCardActions id={project._id} />
        </CardAction>
      </CardHeader>
    </Card>
  );
}
