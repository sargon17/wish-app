import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { BarChart3, Plus, Users } from 'lucide-react'

import DashboardHeader from '@/components/dashboard/DashboardHeader'
import DashboardView from '@/components/dashboard/DashboardView'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { Button } from '@/components/ui/button'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

import { api } from '../../../wish-app/convex/_generated/api.js'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

function Dashboard() {
  const { isLoading, isAuthenticated } = useStoreUserEffect()
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <main className="mx-auto flex h-[calc(100vh-70px)] w-full max-w-7xl flex-col px-4 pb-4 pt-6 md:px-6">
      <DashboardHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Home', to: '/' }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/dashboard/stats" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Stats
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/waitlist" className="gap-2">
                <Users className="h-4 w-4" />
                Waitlist
              </Link>
            </Button>
            <CreateProjectDialog>
              <Button variant="ghost" className="gap-2" disabled={!isAuthenticated}>
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </CreateProjectDialog>
          </>
        }
      />

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
        projects?.length ? (
          <DashboardView
            projects={projects.map((project) => ({
              _id: String(project._id),
              title: project.title,
            }))}
          />
        ) : (
          <article className="rounded-2xl border border-dashed border-border/80 bg-background/70 p-6 text-muted-foreground">
            No projects yet.
          </article>
        )
      ) : null}
    </main>
  )
}
