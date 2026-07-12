import { useStoreUserEffect } from "#/hooks/useStoreUserEffect";
import Loading from "@components/Organisms/Loading";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import DashboardShell from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { isLoading } = useStoreUserEffect();

  return (
    <DashboardShell>
      {isLoading ? <Loading /> : null}
      {!isLoading ? (
        <>
          <Unauthenticated>
            <div className="px-2 text-sm text-muted-foreground">Sign in to view request stats.</div>
          </Unauthenticated>
          <Authenticated>
            <Outlet />
          </Authenticated>
        </>
      ) : null}
    </DashboardShell>
  );
}
