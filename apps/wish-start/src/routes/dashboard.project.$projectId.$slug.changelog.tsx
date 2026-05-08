import { Link, createFileRoute } from '@tanstack/react-router'
import { LayoutDashboard, Plus } from 'lucide-react'
import { useState } from 'react'

import DashboardHeading from '@/components/dashboard/DashboardHeading'
import ProjectChangelogManager from '@/components/project/ProjectChangelogManager'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/changelog')({
  component: ProjectChangelogView,
})

function ProjectChangelogView() {
  const { projectId, slug } = Route.useParams()
  const [newEntryTrigger, setNewEntryTrigger] = useState(0)

  return (
    <ScrollArea className="min-h-0 h-full flex-1 pr-1">
      <div className="flex min-h-full flex-col pb-6 md:px-6 md:pt-6">
        <DashboardHeading
          title={`${slug.replaceAll('-', ' ')} changelog`}
          actions={
            <ButtonGroup>
              <Button type="button" onClick={() => setNewEntryTrigger((value) => value + 1)}>
                <Plus className="h-4 w-4" />
                New entry
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/project/$projectId/$slug" params={{ projectId, slug }}>
                  <LayoutDashboard className="h-4 w-4" />
                  Request Board
                </Link>
              </Button>
            </ButtonGroup>
          }
          breadcrumbs={[
            { label: 'dashboard', url: '/dashboard' },
            { label: slug.replaceAll('-', ' '), url: `/dashboard/project/${projectId}/${slug}` },
          ]}
        />

        <div className="sidebar-offset-pl">
          <ProjectChangelogManager projectId={projectId as never} newEntryTrigger={newEntryTrigger} />
        </div>
      </div>
    </ScrollArea>
  )
}
