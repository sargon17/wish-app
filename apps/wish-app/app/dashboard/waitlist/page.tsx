import { Suspense } from "react";

import DashboardHeading from "@/components/dashboard/DashboardHeading";
import Loading from "@/components/Organisms/Loading";
import { WaitlistTable } from "@/components/waitlist/WaitlistTable";

export default function WaitlistPage() {
  const breadcrumbs = [
    {
      label: "dashboard",
      url: "/dashboard",
    },
  ];

  return (
    <div className="md:px-6 pb-2 md:pt-6 flex flex-col h-screen">
      <DashboardHeading title="Waitlist" actions={null} breadcrumbs={breadcrumbs} />
      <Suspense fallback={<Loading />}>
        <WaitlistTable />
      </Suspense>
    </div>
  );
}
