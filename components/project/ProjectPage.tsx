import { preloadQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { getAuthToken } from '@/lib/auth'
import DashboardBoard from '../Dashboard/DashboardBoard'

interface Props {
  id: string
}

export default async function ProjectPage({ id }: Props) {
  const token = await getAuthToken()
  const preloadedProject = await preloadQuery(api.projects.getProjectById, { id }, { token })
  const preloadedStatuses = await preloadQuery(api.requestStatuses.getByProject, { id }, { token })
  const preloadedRequests = await preloadQuery(api.requests.getByProject, { id }, { token })
  return (
    <>
      <DashboardBoard
        preloadedProject={preloadedProject}
        preloadedStatuses={preloadedStatuses}
        preloadedRequests={preloadedRequests}
      />
    </>
  )
}
