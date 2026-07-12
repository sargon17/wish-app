import DashboardProjectCard from "./DashboardProjectCard";
import useProjects from "#/hooks/useProjects";

export default function DashboardView() {
  const { projects } = useProjects();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 max-md:px-2 p-px">
      {projects &&
        projects.map((project) => <DashboardProjectCard project={project} key={project._id} />)}
    </div>
  );
}
