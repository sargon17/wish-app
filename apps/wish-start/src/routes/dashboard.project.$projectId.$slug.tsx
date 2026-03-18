import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { api } from '../../../wish-app/convex/_generated/api.js'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug')({
  component: ProjectDetails,
})

function ProjectDetails() {
  const { projectId, slug } = Route.useParams()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const requests = useQuery(api.requests.getByProject, { id: projectId })
  const statuses = useQuery(api.requestStatuses.getByProject, { id: projectId })
  const createRequest = useMutation(api.requests.create)
  const deleteRequest = useMutation(api.requests.deleteRequest)

  const defaultStatus = useMemo(() => statuses?.[0], [statuses])

  async function addRequest() {
    const clean = text.trim()
    if (!clean || !defaultStatus) {
      return
    }

    setSubmitting(true)
    try {
      await createRequest({
        text: clean,
        description: '',
        clientId: crypto.randomUUID(),
        project: projectId as never,
        status: defaultStatus._id as never,
      })
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeRequest(id: string) {
    setDeletingId(id)
    try {
      await deleteRequest({ id: id as never })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
      <section className="rounded-2xl border border-border/80 bg-background/70 p-6">
        <DashboardHeader
          title={slug.replaceAll('-', ' ')}
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: 'Dashboard', to: '/dashboard' },
          ]}
        />

        <div className="mt-4 flex gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="New request title"
          />
          <Button type="button" disabled={!text.trim() || !defaultStatus || submitting} onClick={addRequest}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          {!requests ? (
            <p className="text-muted-foreground">Loading requests…</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground">No requests yet for this project.</p>
          ) : (
            requests.map((request) => {
              const status = statuses?.find((item) => String(item._id) === String(request.status))
              const requestId = String(request._id)
              return (
                <article key={requestId} className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium text-foreground">{request.text}</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {status?.displayName ?? status?.name ?? 'Unknown'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRequest(requestId)}
                        disabled={deletingId === requestId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}
