import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import ProjectChangelogManager from '@/components/project/ProjectChangelogManager'
import ProjectViewHeading from '@/components/project/ProjectViewHeading'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/roadmap')({
  component: ProjectRoadmapView,
})

function ProjectRoadmapView() {
  const { projectId, slug } = Route.useParams()
  const [newEntryTrigger, setNewEntryTrigger] = useState(0)

  return (
    <>
      <ProjectViewHeading
        projectId={projectId}
        slug={slug}
        title="Roadmap"
        actions={
          <Button type="button" onClick={() => setNewEntryTrigger((value) => value + 1)}>
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        }
      />
      <ScrollArea className="min-h-0 flex-1 pr-1">
        <div className="sidebar-offset-pl">
          <div className="px-2 pb-6 md:px-6">
            <ProjectChangelogManager projectId={projectId as never} newEntryTrigger={newEntryTrigger} />
          </div>
        </div>
      </ScrollArea>
    </>
  )
}
