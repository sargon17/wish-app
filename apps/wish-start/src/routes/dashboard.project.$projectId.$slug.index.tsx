import { createFileRoute } from '@tanstack/react-router'

import ProjectDashboard from '@/components/project/ProjectDashboard'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/')({
  component: ProjectDashboardRoute,
})

function ProjectDashboardRoute() {
  const { projectId, slug } = Route.useParams()

  return <ProjectDashboard projectId={projectId as never} slug={slug} />
}
