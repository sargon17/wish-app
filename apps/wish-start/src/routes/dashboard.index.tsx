import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Plus } from "lucide-react";

import DashboardView from "@/components/dashboard/DashboardView";
import Loading from "@/components/Organisms/Loading";
import CreateProjectDialog from "@/components/project/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";
import DashboardPage from "@components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard/")({ component: Dashboard });

function Dashboard() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();

  return (
    <DashboardPage
      title="Dashboard"
      breadcrumbs={[{ label: "home", url: "/" }]}
      actions={
        <div className="flex gap-2">
          <CreateProjectDialog>
            <Button variant="ghost" disabled={!isAuthenticated} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </CreateProjectDialog>
        </div>
      }
    >
      {isLoading ? <Loading /> : null}
      {!isLoading ? (
        <>
          <Unauthenticated>
            <div className="px-2 text-sm text-muted-foreground">Sign in to load your projects.</div>
          </Unauthenticated>
          <Authenticated>
            <DashboardView />
          </Authenticated>
        </>
      ) : null}
    </DashboardPage>
  );
}
