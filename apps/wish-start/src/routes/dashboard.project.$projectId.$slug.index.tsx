import { createFileRoute } from '@tanstack/react-router'

import ProjectDashboard from '@/components/project/ProjectDashboard'
import ProjectViewHeading from '@/components/project/ProjectViewHeading'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/')({
  component: ProjectDashboardRoute,
})

function ProjectDashboardRoute() {
  const { projectId, slug } = Route.useParams()

  return (
    <>
      <ProjectViewHeading projectId={projectId} slug={slug} title="Overview" />
      <ProjectDashboard projectId={projectId as never} slug={slug} />
    </>
  )
}
