import { Button } from "@components/ui/button";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import DashboardHeading from "@/components/dashboard/DashboardHeading";
import DashboardView from "@/components/dashboard/DashboardView";
import Loading from "@/components/Organisms/Loading";
import CreateProjectDialog from "@/components/project/CreateProjectDialog";

export default function Dashboard() {
  const breadcrumbs = [
    {
      label: "home",
      url: "/",
    },
  ];

  return (
    <div className="md:px-6 pb-2 md:pt-6 flex flex-col h-screen">
      <DashboardHeading
        title="Dashboard"
        actions={
          <CreateProjectDialog>
            <Button variant="ghost">
              <Plus />
              New Project
            </Button>
          </CreateProjectDialog>
        }
        breadcrumbs={breadcrumbs}
      />
      <Suspense fallback={<Loading />}>
        <DashboardView />
      </Suspense>
    </div>
  );
}
