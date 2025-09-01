'use client'
import { useQuery } from 'convex/react'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { api } from '@/convex/_generated/api'

interface Props {
  id: string
}

export default function ProjectPage({ id }: Props) {
  const project = useQuery(api.projects.getProjectById, { id })
  const statuses = useQuery(api.requestStatuses.getByProject, { id })
  const requests = useQuery(api.requests.getByProject, { id })

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

  if (!project || !statuses)
    return

  return (
    <div>
      Project:
      {' '}
      {project?.title}

      <CreateRequestDialog project={project._id} status={statuses[0]._id} />

      <div className="flex justify-between">
        {statuses?.map(status => (
          <div key={status._id}>
            {status.displayName}
            <div>
              {sortedRequests && sortedRequests[status._id.toString()]?.map(request => (
                <p>{request.text}</p>
              ),
              )}
              <CreateRequestDialog project={project._id} status={status._id} />
            </div>
          </div>
        ))}
      </div>

      {/* <div>
        {requests?.map(request => (
          <div key={request._id}>
            {request.text}
          </div>
        ))}
      </div> */}
    </div>
  )
}
