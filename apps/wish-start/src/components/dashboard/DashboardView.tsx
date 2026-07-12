import useProjects from "#/hooks/useProjects";

import DashboardProjectCard from "./DashboardProjectCard";

export default function DashboardView() {
  const { projects } = useProjects();

  return (
    <div className="grid grid-cols-1 gap-4 p-px max-md:px-2 sm:grid-cols-3 lg:grid-cols-4">
      {projects &&
        projects.map((project) => <DashboardProjectCard project={project} key={project._id} />)}
    </div>
  );
}
