import DashboardHeading from "@/components/dashboard/DashboardHeading";

interface Props {
  projectId: string;
  slug: string;
  title: string;
  actions?: React.ReactNode;
}

export default function ProjectViewHeading({ projectId, slug, title, actions }: Props) {
  return (
    <div className="md:px-6 md:pt-6">
      <DashboardHeading
        title={title}
        breadcrumbs={[
          { label: "home", url: "/" },
          { label: "dashboard", url: "/dashboard" },
          { label: slug.replaceAll("-", " "), url: `/dashboard/project/${projectId}/${slug}` },
        ]}
        actions={actions}
      />
    </div>
  );
}
