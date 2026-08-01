import type { Id } from "@wish/convex-backend/data-model";

import DashboardHeading from "./DashboardHeading";
import ProjectPortalHeaderAction from "./ProjectPortalHeaderAction";

type DashboardPageProps = {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs: { label: string; url: string }[];
  children?: React.ReactNode;
  projectId?: Id<"projects">;
};

const DashboardPage = ({
  title,
  actions,
  breadcrumbs,
  children,
  projectId,
}: DashboardPageProps) => {
  return (
    <div className="flex flex-col gap-4">
      <DashboardHeading
        title={title}
        actions={
          <div className="flex items-center gap-2">
            {projectId ? <ProjectPortalHeaderAction projectId={projectId} /> : null}
            {actions}
          </div>
        }
        breadcrumbs={breadcrumbs}
      />
      <div className="sidebar-offset-pl md:pr-6">{children}</div>
    </div>
  );
};

export default DashboardPage;
