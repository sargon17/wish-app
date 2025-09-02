'use client'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { useStatusesStore } from '@/app/providers/StatusesStoreProvider'
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

  const { add } = useStatusesStore(state => state)

  useEffect(() => {
    statuses
    && add(statuses)
  }, [statuses])

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
      <div className="md:px-6 md:pt-6">
        <DashboardHeading
          title={project?.title}
          actions={(
            <CreateRequestDialog project={project._id} status={statuses[0]._id}>
              <Button className="shrink-0">
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
