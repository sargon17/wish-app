import DashboardHeading from "./DashboardHeading";

type DashboardPageProps = {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs: { label: string; url: string }[];
  children?: React.ReactNode;
};

const DashboardPage = ({ title, actions, breadcrumbs, children }: DashboardPageProps) => {
  return (
    <div className="flex flex-col gap-4">
      <DashboardHeading title={title} actions={actions} breadcrumbs={breadcrumbs} />
      <div className="md:pr-6 sidebar-offset-pl">{children}</div>
    </div>
  );
};

export default DashboardPage;
