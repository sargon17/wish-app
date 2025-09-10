
import { Suspense } from 'react'
import { api } from '@/convex/_generated/api'
import DashboardBoard from '../dashboard/DashboardBoard'
import { getAuthToken } from '@/lib/auth'
import { preloadQuery } from "convex/nextjs";


interface Props {
  id: string
}

export default async function ProjectPage({ id }: Props) {
  const token = await getAuthToken()
  const preloadedProject = await preloadQuery(api.projects.getProjectById, { id }, { token })
  const preloadedStatuses = await preloadQuery(api.requestStatuses.getByProject, {id}, {token})
  const preloadedRequests = await preloadQuery(api.requests.getByProject, {id}, {token})
  return (
    <Suspense fallback="loading">
      <DashboardBoard preloadedProject={preloadedProject}
      preloadedStatuses={preloadedStatuses}
      preloadedRequests={preloadedRequests} />
    </Suspense>
  )
}
