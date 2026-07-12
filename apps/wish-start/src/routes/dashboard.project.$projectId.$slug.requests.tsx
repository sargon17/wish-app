import { createFileRoute } from "@tanstack/react-router";

import DashboardBoard from "@/components/dashboard/DashboardBoard";
import { RequestsCreateEditButton } from "@/components/Request/RequestCreateEditDialog";
import ButtonSwitcher from "@components/molecules/ButtonSwitcher";
import { useBoardType } from "#/hooks/useBoardType.ts";
import { boardTypeValues } from "#/lib/requestBoard/boardType";
import DashboardPage from "@components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/requests")({
  component: ProjectRequestsRoute,
});

function ProjectRequestsRoute() {
  const { projectId, slug } = Route.useParams();
  const { type: boardType, switchTo: switchToBoardType } = useBoardType();

  return (
    <>
      <DashboardPage
        title="Requests"
        breadcrumbs={[
          { label: "home", url: "/" },
          { label: "dashboard", url: "/dashboard" },
          { label: slug.replaceAll("-", " "), url: `/dashboard/project/${projectId}/${slug}` },
        ]}
        actions={
          <div className="flex gap-2">
            <ButtonSwitcher
              switches={boardTypeValues}
              selected={boardType}
              onChange={(type) => switchToBoardType(type)}
            />
            <RequestsCreateEditButton projectId={projectId as never} />
          </div>
        }
      ></DashboardPage>
      {/*outside page scope for styling purpouses */}
      <DashboardBoard projectId={projectId as never} boardType={boardType} />
    </>
  );
}
