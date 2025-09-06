import type { Doc } from '@/convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { useEffect } from 'react'
import { useStatusesStore } from '@/app/providers/StatusesStoreProvider'

import { api } from '@/convex/_generated/api'
import DashboardBoardColumn from './DashboardBoardColumn'

interface Props {
  project: Doc<'projects'>
}
export default function DashboardBoard({ project }: Props) {
  const statuses = useQuery(api.requestStatuses.getByProject, { id: project._id })
  const requests = useQuery(api.requests.getByProject, { id: project._id })

  // const { values: storedStatuses, add } = useStatusesStore(state => state)

  // useEffect(() => {
  //   statuses && statuses.map(status => {
  //     if (!storedStatuses.find((item) => item._id === status._id)) add([status])
  //   })
  // }, [statuses])

  const sortedRequests = (() => {
    const response: {
      [key: string]: typeof requests
    } = {}

    requests && requests.map((r) => {
      if (!response[r.status]) {
        response[r.status] = []
      }
      return response[r.status]?.push(r)
    })
    return response
  })()

  return (
    <div className="flex h-full gap-2 w-full overflow-x-scroll px-2 md:px-6">
      {statuses?.map(status => (
        <DashboardBoardColumn
          key={status._id}
          title={status.displayName}
          requests={sortedRequests[status._id.toString()]}
          projectId={project._id}
          statusId={status._id}
        />
      ))}
    </div>
  )
}
