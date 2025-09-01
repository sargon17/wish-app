'use client'
import { useQuery } from 'convex/react'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { api } from '@/convex/_generated/api'
import DashboardBoard from '../dashboard/DashboardBoard'
import DashboardHeading from '../dashboard/DashboardHeading'
import { Button } from '../ui/button'

interface Props {
  id: string
}

export default function ProjectPage({ id }: Props) {
  const project = useQuery(api.projects.getProjectById, { id })
  const statuses = useQuery(api.requestStatuses.getByProject, { id })
  const requests = useQuery(api.requests.getByProject, { id })

  if (!project || !statuses)
    return

  const breadcrumbs = [
    {
      label: 'home',
      url: '/',
    },
    {
      label: 'dashboard',
      url: '/dashboard',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6">
        <DashboardHeading
          title={project?.title}
          actions={(
            <CreateRequestDialog project={project._id} status={statuses[0]._id}>
              <Button>
                New Request
              </Button>
            </CreateRequestDialog>
          )}
          breadcrumbs={breadcrumbs}
        />
      </div>
      <DashboardBoard project={project} statuses={statuses} requests={requests} />

    </div>
  )
}
