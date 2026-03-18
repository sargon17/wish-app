import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'

import DashboardHeader from '@/components/dashboard/DashboardHeader'

import { api } from '@/convex/api'

export const Route = createFileRoute('/dashboard/stats')({ component: StatsPage })

function StatsPage() {
  const stats = useQuery(api.stats.requestOverview)

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
      <section className="rounded-2xl border border-border/80 bg-background/70 p-6">
        <DashboardHeader
          title="Request stats"
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Dashboard', to: '/dashboard' }]}
        />
        <p className="mt-2 text-sm text-muted-foreground">Live overview from Convex.</p>

        {!stats ? (
          <p className="mt-6 text-muted-foreground">Loading stats…</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total requests</p>
              <p className="mt-2 text-3xl font-semibold">{stats.totalRequests}</p>
            </article>
            <article className="rounded-xl border border-border/70 bg-background p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top statuses</p>
              <ul className="mt-3 space-y-2 text-sm">
                {stats.statusBreakdown.slice(0, 5).map((status: any) => (
                  <li key={String(status.statusId)} className="flex items-center justify-between">
                    <span>{status.displayName ?? status.name}</span>
                    <span className="text-muted-foreground">{status.count}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        )}
      </section>
    </main>
  )
}
