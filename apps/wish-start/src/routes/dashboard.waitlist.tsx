import DashboardPage from "@components/dashboard/DashboardPage";
import { createFileRoute } from "@tanstack/react-router";

import { WaitlistTable } from "@/components/waitlist/WaitlistTable";

export const Route = createFileRoute("/dashboard/waitlist")({ component: WaitlistPage });

function WaitlistPage() {
  return (
    <>
      <DashboardPage
        title="Waitlist"
        actions={null}
        breadcrumbs={[{ label: "dashboard", url: "/dashboard" }]}
      >
        <WaitlistTable />
      </DashboardPage>
    </>
  );
}
