import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import ProjectChangelogManager from '@/components/project/ProjectChangelogManager'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/roadmap')({
  component: ProjectRoadmapView,
})

function ProjectRoadmapView() {
  const { projectId } = Route.useParams()
  const [newEntryTrigger, setNewEntryTrigger] = useState(0)

  return (
    <ScrollArea className="min-h-0 h-full flex-1 pr-1">
      <div className="flex min-h-full flex-col gap-4 pb-6 md:px-6 sidebar-offset-pl">
        <div className="flex justify-end">
          <Button type="button" onClick={() => setNewEntryTrigger((value) => value + 1)}>
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        </div>
        <ProjectChangelogManager projectId={projectId as never} newEntryTrigger={newEntryTrigger} />
      </div>
    </ScrollArea>
  )
}
