import { createFileRoute } from "@tanstack/react-router";

import DashboardView from "@/components/dashboard/DashboardView";
import { CreateProjectButton } from "@/components/project/CreateProjectDialog";
import DashboardPage from "@components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

function Dashboard() {
  return (
    <DashboardPage
      title="Dashboard"
      breadcrumbs={[{ label: "home", url: "/" }]}
      actions={<CreateProjectButton />}
    >
      <DashboardView />
    </DashboardPage>
  );
}
