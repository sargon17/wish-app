import { Suspense } from "react";

import DashboardHeading from "@/components/dashboard/DashboardHeading";
import Loading from "@/components/Organisms/Loading";
import { StatsPageContent } from "@/components/stats/StatsPageContent";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StatsPage() {
  const breadcrumbs = [
    { label: "dashboard", url: "/dashboard" },
    { label: "stats", url: "/dashboard/stats" },
  ];

  return (
    <ScrollArea className="flex-1 min-h-0 pr-1">
      <div className="md:px-6 pb-2 md:pt-6 flex flex-col h-screen min-h-0">
        <DashboardHeading title="Request stats" actions={null} breadcrumbs={breadcrumbs} />
        <Suspense fallback={<Loading />}>
          <div className="pb-6">
            <StatsPageContent />
          </div>
        </Suspense>
      </div>
    </ScrollArea>
  );
}
