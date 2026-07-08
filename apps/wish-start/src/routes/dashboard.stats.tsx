import { createFileRoute } from "@tanstack/react-router";
import { StatsPageContent } from "@/components/stats/StatsPageContent";
import DashboardPage from "@components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard/stats")({ component: StatsPage });

function StatsPage() {
  return (
    <DashboardPage
      title="Request stats"
      actions={null}
      breadcrumbs={[
        { label: "dashboard", url: "/dashboard" },
        { label: "stats", url: "/dashboard/stats" },
      ]}
    >
      <StatsPageContent />
    </DashboardPage>
  );
}
