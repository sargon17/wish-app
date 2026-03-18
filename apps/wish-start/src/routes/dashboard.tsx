import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useQuery } from 'convex/react'

import { Button } from '@/components/ui/button'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

import { api } from '../../../wish-app/convex/_generated/api.js'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

function Dashboard() {
  const { isLoading, isAuthenticated } = useStoreUserEffect()
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <main className="mx-auto flex h-[calc(100vh-70px)] w-full max-w-7xl flex-col px-4 pb-4 pt-6 md:px-6">
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Home / Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>

        <Button variant="ghost" className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </section>

      {!isAuthenticated && !isLoading ? (
        <section className="rounded-2xl border border-border/80 bg-background/70 p-6 text-muted-foreground">
          Sign in to load your projects.
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-2xl border border-border/80 bg-background/70 p-6 text-muted-foreground">
          Loading dashboard…
        </section>
      ) : null}

      {isAuthenticated && !isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.length ? (
            projects.map((project) => (
              <article
                key={project._id}
                className="rounded-2xl border border-border/80 bg-background/70 p-4 shadow-xs"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Project
                </p>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{project.title}</h2>
                <p className="mt-3 text-xs text-muted-foreground">id: {project._id}</p>
              </article>
            ))
          ) : (
            <article className="rounded-2xl border border-dashed border-border/80 bg-background/70 p-6 text-muted-foreground">
              No projects yet.
            </article>
          )}
        </section>
      ) : null}
    </main>
  )
}
