import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { Cog, Newspaper, Plus } from 'lucide-react'

import DashboardBoard from '@/components/dashboard/DashboardBoard'
import DashboardHeading from '@/components/dashboard/DashboardHeading'
import Loading from '@/components/Organisms/Loading'
import ProjectSettings from '@/components/project/ProjectSettings'
import RequestCreateEditDialog from '@/components/Request/RequestCreateEditDialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug')({
  component: ProjectDetails,
})

function ProjectDetails() {
  const { projectId, slug } = Route.useParams()
  const { isLoading, isAuthenticated } = useStoreUserEffect()
  const location = useLocation()
  const isChangelogView = location.pathname.endsWith('/changelog')

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden">
        <Loading />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden px-6 py-6 text-sm text-muted-foreground">
        Sign in to load this project.
      </div>
    )
  }

  if (isChangelogView) {
    return <Outlet />
  }

  return (
    <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden">
      <div className="md:px-6 md:pt-6">
        <DashboardHeading
          title={slug.replaceAll("-", " ")}
          breadcrumbs={[
            { label: "home", url: "/" },
            { label: "dashboard", url: "/dashboard" },
          ]}
          actions={
            <ButtonGroup>
              <RequestCreateEditDialog project={projectId as never}>
                <Button className="shrink-0" variant="outline">
                  <Plus />
                  New Request
                </Button>
              </RequestCreateEditDialog>

              <Button className="shrink-0" variant="outline" asChild>
                <Link to="/dashboard/project/$projectId/$slug/changelog" params={{ projectId, slug }}>
                  <Newspaper />
                  Changelog
                </Link>
              </Button>

              <ProjectSettings projectID={projectId as never}>
                <Button variant="outline" className="group/button">
                  <Cog className="transition-all group-hover/button:rotate-45" />
                </Button>
              </ProjectSettings>
            </ButtonGroup>
          }
        />
      </div>
      <DashboardBoard projectId={projectId as never} />
    </div>
  )
}
