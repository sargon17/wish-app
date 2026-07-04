import { createFileRoute } from '@tanstack/react-router'

import DashboardBoard from '@/components/dashboard/DashboardBoard'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/requests')({
  component: ProjectRequestsRoute,
})

function ProjectRequestsRoute() {
  const { projectId } = Route.useParams()

  return <DashboardBoard projectId={projectId as never} />
}
