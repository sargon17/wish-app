import type { Doc } from '@/convex/_generated/dataModel'
import DashboardBoardColumn from './DashboardBoardColumn'

interface Props {
  statuses: Doc<'requestStatuses'>[]
  project: Doc<'projects'>
  requests?: Doc<'requests'>[]
}
export default function DashboardBoard({ statuses, project, requests }: Props) {
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
