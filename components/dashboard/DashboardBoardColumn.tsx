'use client'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import { api } from '@/convex/_generated/api'
import CreateRequestDialog from '../requests/CreateRequestDialog'
import RequestCard from '../requests/RequestsCard'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'

interface Props {
  title: string
  requests?: Doc<'requests'>[]
  projectId: Id<'projects'>
  statusId: Id<'requestStatuses'>
}

export default function DashboardBoardColumn({ title, requests, projectId, statusId }: Props) {
  const updateStatus = useMutation(api.requests.updateStatus)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragDepth = useRef(0)

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!isDraggingOver)
      setIsDraggingOver(true)
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepth.current += 1
    if (!isDraggingOver)
      setIsDraggingOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setIsDraggingOver(false)
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepth.current = 0
    setIsDraggingOver(false)
    const requestId = e.dataTransfer.getData('requestId')
    if (!requestId)
      return
    try {
      await updateStatus({ id: requestId as unknown as Id<'requests'>, status: statusId })
    }
    catch (err) {
      console.error('Failed to move request', err)
    }
    finally {
      setIsDraggingOver(false)
    }
  }
  return (
    <div
      className="w-90 border-2 border-zinc-100 dark:border-zinc-900 rounded-xl h-full p-3 shrink-0 flex flex-col gap-2 relative"
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
    >
      <div className="flex justify-between items-center font-semibold">
        {title}
        <CreateRequestDialog project={projectId} status={statusId}>
          <Button size="icon" variant="ghost">
            +
          </Button>
        </CreateRequestDialog>
      </div>
      <Separator />
      <div
        className="relative flex flex-col gap-2 min-h-14 overflow-y-scroll overflow-x-visible"
      >
        {requests && requests.map(request => (
          <RequestCard request={request} key={request._id} />
        ),
        )}
      </div>
      {isDraggingOver && (
        <div
          className="absolute inset-0 z-10 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          Drop here to move
        </div>

      )}
    </div>
  )
}
