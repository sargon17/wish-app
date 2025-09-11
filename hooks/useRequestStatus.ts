import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '@/convex/_generated/api'
import { findCurrentStatus } from '@/lib/requestStatus/findCurrentStatus'
import { findNextStatus } from '@/lib/requestStatus/findNextStatus'

type Status = Doc<'requestStatuses'>
interface UseRequestStatusProps {
  request: Doc<'requests'>
}
type UseRequestSetStatusProps = Status

type UseRequestSetByIdProps = Id<'requestStatuses'>

interface UseRequestStatusState {
  current: Status | undefined
  statuses: Status[] | undefined
  hasChanged: boolean
}
interface UseRequestStatusMethods {
  setById: (args: UseRequestSetByIdProps) => void
  setNext: () => void
  save: () => void
}

export interface UseRequestStatusReturn {
  state: UseRequestStatusState
  methods: UseRequestStatusMethods
}

export function useRequestStatus({ request }: UseRequestStatusProps): UseRequestStatusReturn {
  const statuses = useQuery(api.requestStatuses.getByProject, { id: request.project })
  const originalStatus = findCurrentStatus({ id: request.status, statuses })
  const [status, setStatus] = useState<Doc<'requestStatuses'> | undefined>(originalStatus)
  const [hasChanged, setHasChanged] = useState(false)

  const editRequest = useMutation(api.requests.edit)

  const checkIfChanged = (status: Doc<'requestStatuses'>) => {
    if (status?._id !== originalStatus?._id) {
      setHasChanged(true)
      return
    }
    setHasChanged(false)
  }

  const set = (val: UseRequestSetStatusProps) => {
    setStatus(val)
    checkIfChanged(val)
  }

  const setById = (id: UseRequestSetByIdProps) => {
    const status = findCurrentStatus({ id, statuses })
    status && set(status)
  }

  const setNextStatus = () => {
    if (!statuses || !status)
      return
    const newStatus = findNextStatus({ current: status, statuses })
    set(newStatus)
  }

  const save = () => {
    status
    && editRequest({ id: request._id, text: request.text, status: status?._id })
  }

  const state = {
    current: status,
    statuses,
    hasChanged,
  }

  const methods = {
    setById,
    setNext: setNextStatus,
    save,
  }

  return { state, methods }
}
