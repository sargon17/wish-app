import { Link, createFileRoute } from '@tanstack/react-router'
import { Authenticated, Unauthenticated } from 'convex/react'
import { BarChart3, Plus, Users } from 'lucide-react'

import DashboardHeading from '@/components/dashboard/DashboardHeading'
import DashboardView from '@/components/dashboard/DashboardView'
import Loading from '@/components/Organisms/Loading'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { Button } from '@/components/ui/button'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

export const Route = createFileRoute('/dashboard/')({ component: Dashboard })

function Dashboard() {
  const { isLoading, isAuthenticated } = useStoreUserEffect()

  return (
    <div className="flex h-screen flex-col pb-2 md:px-6 md:pt-6">
      <DashboardHeading
        title="Dashboard"
        breadcrumbs={[{ label: 'home', url: '/' }]}
        actions={
          <div className="flex gap-2">
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
              <Button variant="ghost" disabled={!isAuthenticated} className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </CreateProjectDialog>
          </div>
        }
      />
      {isLoading ? <Loading /> : null}
      {!isLoading ? (
        <>
          <Unauthenticated>
            <div className="px-2 text-sm text-muted-foreground">Sign in to load your projects.</div>
          </Unauthenticated>
          <Authenticated>
            <DashboardView />
          </Authenticated>
        </>
      ) : null}
    </div>
  )
}
