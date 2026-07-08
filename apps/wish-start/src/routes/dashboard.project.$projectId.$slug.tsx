import { Outlet, createFileRoute } from "@tanstack/react-router";

import Loading from "@/components/Organisms/Loading";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug")({
  component: ProjectDetails,
});

function ProjectDetails() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();

  return (
    <div className="flex h-[calc(100dvh-8px)] flex-col">
      {isLoading ? (
        <Loading />
      ) : !isAuthenticated ? (
        <div className="px-6 py-6 text-sm text-muted-foreground">Sign in to load this project.</div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
