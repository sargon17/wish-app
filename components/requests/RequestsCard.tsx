'use client'
import type { Doc } from '@/convex/_generated/dataModel'
import { Ellipsis } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../ui/card'
import RequestCardActions from './RequestCardActions'

interface Props {
  request: Doc<'requests'>
}

export default function RequestCard({ request }: Props) {
  return (
    <Card
      draggable
      onDragStart={(e) => {
        try {
          const id = request._id as unknown as string
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('requestId', id)
          e.dataTransfer.setData('text/plain', id)
        }
        catch {
          // noop
        }
      }}
      className="w-full relative group/request-card"
      key={request._id}
      data-request={request._id}
    >
      {/* <Link href={`dashboard/project/${project._id}`} className="absolute inset-0 z-0" /> */}
      <CardHeader>
        <CardTitle className=" capitalize">{request.text}</CardTitle>
        {
          request.description && (
            <CardDescription>{request.description}</CardDescription>
          )
        }
        <CardAction>
          <RequestCardActions id={request._id} />
        </CardAction>
      </CardHeader>
    </Card>
  )
}
