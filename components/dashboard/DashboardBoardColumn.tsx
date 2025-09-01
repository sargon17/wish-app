import type { Doc, Id } from '@/convex/_generated/dataModel'
import CreateRequestDialog from '../requests/CreateRequestDialog'

interface Props {
  title: string
  requests?: Doc<'requests'>[]
  projectId: Id<'projects'>
  statusId: Id<'requestStatuses'>
}

export default function DashboardBoardColumn({ title, requests, projectId, statusId }: Props) {
  return (
    <div className="w-90 border-2 border-zinc-100 dark:border-zinc-900 rounded-xl h-full p-3 shrink-0">
      {title}
      <div>
        {requests && requests.map(request => (
          <p>{request.text}</p>
        ),
        )}
        <CreateRequestDialog project={projectId} status={statusId} variant="ghost">New Request</CreateRequestDialog>
      </div>
    </div>
  )
}
