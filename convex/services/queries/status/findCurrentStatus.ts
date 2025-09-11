import type { Doc, Id } from '@/_generated/dataModel'

interface GetFullStatusProps {
  id: Id<'requestStatuses'>
  statuses: Doc<'requestStatuses'>[] | undefined
}

export function findCurrentStatus({ id, statuses }: GetFullStatusProps) {
  return statuses?.find(status => status._id === id)
}
