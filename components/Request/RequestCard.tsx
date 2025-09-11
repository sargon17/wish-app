'use client'
import type { Doc } from '@/convex/_generated/dataModel'
import { trimTo } from '@/lib/text'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import RequestDetailView from './DetailView/RequestDeatailView'
import RequestCardActions from './RequestCardActions'

interface Props {
  request: Doc<'requests'>
}

export default function RequestCard({ request }: Props) {
  return (
    <RequestDetailView request={request}>
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
        <CardHeader>
          <CardTitle className=" capitalize">{request.text}</CardTitle>
          <CardAction onClick={e => e.stopPropagation()}>
            <RequestCardActions request={request} />
          </CardAction>
        </CardHeader>
        {
          request.description && (
            <CardContent>
              <p className="text-secondary-foreground text-sm">
                {trimTo({ text: request.description })}
              </p>
            </CardContent>
          )
        }
      </Card>
    </RequestDetailView>
  )
}
