import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

const columns = [
  {
    title: 'Backlog',
    items: ['Public roadmap', 'Upvotes API', 'Role permissions'],
  },
  {
    title: 'In Progress',
    items: ['TanStack Start migration', 'Clerk + Convex wiring'],
  },
  {
    title: 'Shipped',
    items: ['Comment delete endpoint', 'Waitlist landing refresh'],
  },
]

function Dashboard() {
  return (
    <main className="mx-auto flex h-[calc(100vh-70px)] w-full max-w-7xl flex-col px-4 pb-4 pt-6 md:px-6">
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Home / Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>

        <Button variant="ghost" className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </section>

      <section className="grid flex-1 gap-4 overflow-hidden md:grid-cols-3">
        {columns.map((column) => (
          <article
            key={column.title}
            className="flex min-h-0 flex-col rounded-2xl border border-border/80 bg-background/70 p-4"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {column.title}
            </h2>
            <div className="space-y-2 overflow-auto pr-1">
              {column.items.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-xs"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
