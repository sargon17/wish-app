import type { Doc, Id } from '@/convex/_generated/dataModel'
import CreateRequestDialog from '../requests/CreateRequestDialog'
import { Button } from '../ui/button'

interface Props {
  title: string
  requests?: Doc<'requests'>[]
  projectId: Id<'projects'>
  statusId: Id<'requestStatuses'>
}

export default function DashboardBoardColumn({ title, requests, projectId, statusId }: Props) {
  return (
    <div className="w-90 border-2 border-zinc-100 dark:border-zinc-900 rounded-xl h-full p-3 shrink-0 flex flex-col">
      <div className="flex justify-between">
        {title}
        <CreateRequestDialog project={projectId} status={statusId}>
          <Button size="icon" variant="ghost">
            +
          </Button>
        </CreateRequestDialog>
      </div>
      <div>
        {requests && requests.map(request => (
          <p>{request.text}</p>
        ),
        )}
        <div className="">
        </div>
      </div>
    </div>
  )
}
