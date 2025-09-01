'use client'
import { useQuery } from 'convex/react'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { api } from '@/convex/_generated/api'
import DashboardBoard from '../dashboard/DashboardBoard'
import DashboardHeading from '../dashboard/DashboardHeading'

interface Props {
  id: string
}

export default function ProjectPage({ id }: Props) {
  const project = useQuery(api.projects.getProjectById, { id })
  const statuses = useQuery(api.requestStatuses.getByProject, { id })
  const requests = useQuery(api.requests.getByProject, { id })

  if (!project || !statuses)
    return

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <DashboardHeading
          title={project?.title}
          actions={
            <CreateRequestDialog project={project._id} status={statuses[0]._id}>New Request</CreateRequestDialog>
          }
        />
      </div>
      <DashboardBoard project={project} statuses={statuses} requests={requests} />

    </div>
  )
}
