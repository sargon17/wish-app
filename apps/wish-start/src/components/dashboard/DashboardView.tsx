import DashboardProjectCard from './DashboardProjectCard'

type Project = { _id: string; title: string }

export default function DashboardView({ projects }: { projects: Project[] }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 max-md:px-2 p-0.25">
      {projects.map((project) => (
        <DashboardProjectCard project={project} key={project._id} />
      ))}
    </div>
  )
}
