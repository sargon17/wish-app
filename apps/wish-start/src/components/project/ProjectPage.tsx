import DashboardBoard from "@/components/dashboard/DashboardBoard";
import type { Id } from "@wish/convex-backend/data-model";

interface Props {
  id: string;
}

export default function ProjectPage({ id }: Props) {
  const projectId = id as Id<"projects">;
  return <DashboardBoard projectId={projectId} />;
}
