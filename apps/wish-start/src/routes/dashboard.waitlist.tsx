import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'

import { Button } from '@/components/ui/button'

import { api } from '../../../wish-app/convex/_generated/api.js'

export const Route = createFileRoute('/dashboard/waitlist')({ component: WaitlistPage })

function WaitlistPage() {
  const entries = useQuery(api.waitlist.list)
  const markInvited = useMutation(api.waitlist.setStatus)

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
      <section className="rounded-2xl border border-border/80 bg-background/70 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Waitlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage invited users.</p>

        {!entries ? (
          <p className="mt-6 text-muted-foreground">Loading waitlist…</p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No waitlist entries yet.</p>
        ) : (
          <div className="mt-6 overflow-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const status = entry.invitedAt ? 'invited' : 'pending'
                  return (
                    <tr key={String(entry._id)} className="border-t border-border/60">
                      <td className="px-4 py-3">{entry.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(entry.appliedAt || 0).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{status}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={status === 'invited'}
                          onClick={() => markInvited({ id: entry._id as never, status: 'invited' })}
                        >
                          Mark invited
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
