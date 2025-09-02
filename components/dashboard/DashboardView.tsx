'use client'
import { useQuery } from 'convex/react'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { api } from '@/convex/_generated/api'
import DashboardHeading from './DashboardHeading'
import DashboardProjectCard from './DashboardProjectCard'

export default function DashboardView() {
  const projects = useQuery(api.projects.getProjectsForUser)

  const breadcrumbs = [
    {
      label: 'home',
      url: '/',
    },
  ]

  return (
    <div className="md:px-6 pb-2 md:pt-6 flex flex-col h-screen">
      <DashboardHeading
        title="Dashboard"
        actions={<CreateProjectDialog>New Project</CreateProjectDialog>}
        breadcrumbs={breadcrumbs}
      />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 max-md:px-2 overflow-y-scroll">
        {projects?.map(project =>
          <DashboardProjectCard project={project} key={project._id} />,
        )}
      </div>

    </div>
  )
}
