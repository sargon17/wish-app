'use client'
import { useQuery } from 'convex/react'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { api } from '@/convex/_generated/api'
import { SidebarTrigger } from '../ui/sidebar'
import DashboardHeading from './DashboardHeading'
import DashboardProjectCard from './DashboardProjectCard'

export default function DashboardView() {
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <div>
      <DashboardHeading
        title="Dashboard"
        actions={<CreateProjectDialog>New Project</CreateProjectDialog>}
      />
      <div className="grid gap-4 grid-cols-4">
        {projects?.map(project =>
          <DashboardProjectCard project={project} />,
        )}
      </div>

    </div>
  )
}
