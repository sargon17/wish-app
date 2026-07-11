import { createFileRoute } from "@tanstack/react-router";

import DashboardBoard from "@/components/dashboard/DashboardBoard";
import ButtonSwitcher from "@components/molecules/ButtonSwitcher";
import { useBoardType } from "#/hooks/useBoardType";
import { boardTypeValues } from "#/lib/requestBoard/boardType";
import DashboardPage from "@components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard/project/$projectId/$slug/complaints")({
  component: ProjectComplaintsRoute,
});

function ProjectComplaintsRoute() {
  const { projectId, slug } = Route.useParams();
  const { type: boardType, switchTo: switchToBoardType } = useBoardType();

  return (
    <>
      <DashboardPage
        breadcrumbs={[
          { label: "home", url: "/" },
          { label: "dashboard", url: "/dashboard" },
          { label: slug.replaceAll("-", " "), url: `/dashboard/project/${projectId}/${slug}` },
        ]}
        title="Complaints"
        actions={
          <div>
            <ButtonSwitcher
              switches={boardTypeValues}
              selected={boardType}
              onChange={(type) => switchToBoardType(type)}
            />
          </div>
        }
      ></DashboardPage>
      {/*outside page scope for styling purpouses */}
      <DashboardBoard projectId={projectId as never} boardType={boardType} kind="complaint" />
    </>
  );
}
