import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { AlertTriangle, Cog, LayoutDashboard, ListTodo, Map, Plus } from 'lucide-react'
import type { ReactNode } from 'react'

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
  const projectName = slug.replaceAll('-', ' ')

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

  return (
    <div className="flex h-[calc(100dvh-8px)] flex-col overflow-hidden">
      <div className="md:px-6 md:pt-6">
        <DashboardHeading
          title={projectName}
          breadcrumbs={[
            { label: 'home', url: '/' },
            { label: 'dashboard', url: '/dashboard' },
          ]}
          actions={
            <ButtonGroup>
              <NavButton
                to="/dashboard/project/$projectId/$slug"
                projectId={projectId}
                slug={slug}
                active={location.pathname === `/dashboard/project/${projectId}/${slug}`}
              >
                <LayoutDashboard />
                Overview
              </NavButton>
              <NavButton
                to="/dashboard/project/$projectId/$slug/requests"
                projectId={projectId}
                slug={slug}
                active={location.pathname.endsWith('/requests')}
              >
                <ListTodo />
                Requests
              </NavButton>
              <NavButton
                to="/dashboard/project/$projectId/$slug/complaints"
                projectId={projectId}
                slug={slug}
                active={location.pathname.endsWith('/complaints')}
              >
                <AlertTriangle />
                Complaints
              </NavButton>
              <NavButton
                to="/dashboard/project/$projectId/$slug/roadmap"
                projectId={projectId}
                slug={slug}
                active={location.pathname.endsWith('/roadmap')}
              >
                <Map />
                Roadmap
              </NavButton>
              <RequestCreateEditDialog project={projectId as never}>
                <Button className="shrink-0" variant="outline">
                  <Plus />
                  New Request
                </Button>
              </RequestCreateEditDialog>
              <ProjectSettings projectID={projectId as never}>
                <Button variant="outline" className="group/button">
                  <Cog className="transition-all group-hover/button:rotate-45" />
                </Button>
              </ProjectSettings>
            </ButtonGroup>
          }
        />
      </div>
      <Outlet />
    </div>
  )
}

type ProjectRouteTo =
  | "/dashboard/project/$projectId/$slug"
  | "/dashboard/project/$projectId/$slug/requests"
  | "/dashboard/project/$projectId/$slug/complaints"
  | "/dashboard/project/$projectId/$slug/roadmap";

function projectParams(projectId: string, slug: string) {
  return { projectId, slug };
}

function NavButton({
  to,
  active,
  children,
  projectId,
  slug,
}: {
  to: ProjectRouteTo;
  active: boolean;
  children: ReactNode;
  projectId: string;
  slug: string;
}) {
  return (
    <Button className="shrink-0" variant={active ? "secondary" : "outline"} asChild>
      <Link to={to} params={projectParams(projectId, slug)}>
        {children}
      </Link>
    </Button>
  );
}
