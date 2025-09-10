'use client'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import DashboardProjectCard from './DashboardProjectCard'

export default function DashboardView() {
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 max-md:px-2 overflow-y-scroll">
      {projects && projects.map(project =>
        <DashboardProjectCard project={project} key={project._id} />,
      )}
    </div>
  )
}
