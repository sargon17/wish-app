import type { Dispatch, SetStateAction } from 'react'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '@/convex/_generated/api'
import { findCurrentStatus } from '@/convex/services/queries/status/findCurrentStatus'
import { findNextStatus } from '@/convex/services/queries/status/findNextStatus'

type Status = Doc<'requestStatuses'>
interface UseRequestStatusProps {
  request: Doc<'requests'>
}
type UseRequestSetStatusProps = Status

type UseRequestSetByIdProps = Id<'requestStatuses'>

type UseRequestStatusReturn = [
  Status | undefined,
  Status[] | undefined,
  boolean,
  {
    setById: (args: UseRequestSetByIdProps) => void
    setNext: () => void
    save: () => void
  },
]

export function useRequestStatus({ request }: UseRequestStatusProps): UseRequestStatusReturn {
  const statuses = useQuery(api.requestStatuses.getByProject, { id: request.project })
  const originalStatus = findCurrentStatus({ id: request.status, statuses })
  const [status, setStatus] = useState<Doc<'requestStatuses'> | undefined>(originalStatus)
  const [isChanged, setIsChanged] = useState(false)

  const editRequest = useMutation(api.requests.edit)

  const checkIfChanged = (status: Doc<'requestStatuses'>) => {
    if (status?._id !== originalStatus?._id) {
      setIsChanged(true)
      return
    }
    setIsChanged(false)
  }

  const set = (val: UseRequestSetStatusProps) => {
    setStatus(val)
    checkIfChanged(val)
  }

  const setById = (id: UseRequestSetByIdProps) => {
    set(findCurrentStatus({ id, statuses }))
  }

  const setNextStatus = () => {
    if (!statuses)
      return
    const newStatus = findNextStatus({ current: status, statuses })
    set(newStatus)
  }

  const save = () => {
    status
    && editRequest({ id: request._id, text: request.text, status: status?._id })
  }

  const methods = {
    setById,
    setNext: setNextStatus,
    save,
  }

  return [status, statuses, isChanged, methods]
}
