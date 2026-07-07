import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import DashboardBoard from '@/components/dashboard/DashboardBoard'
import ProjectViewHeading from '@/components/project/ProjectViewHeading'
import RequestCreateEditDialog from '@/components/Request/RequestCreateEditDialog'
import { Button } from '@/components/ui/button'
import ButtonSwitcher from '@components/molecules/ButtonSwitcher'
import { useBoardType } from '#/hooks/useBoardType.ts'
import { boardTypeValues } from '#/lib/requestBoard/boardType'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/requests')({
  component: ProjectRequestsRoute,
})

function ProjectRequestsRoute() {
  const { projectId, slug } = Route.useParams()
  const { type: boardType, switchTo: switchToBoardType } = useBoardType()


  return (
    <>
      <ProjectViewHeading
        projectId={projectId}
        slug={slug}
        title="Requests"
        actions={
          <div className='flex gap-2'>
            <ButtonSwitcher switches={boardTypeValues} selected={boardType} onChange={(type) => switchToBoardType(type)} />
            <RequestCreateEditDialog project={projectId as never}>
              <Button className="shrink-0" variant="outline">
                <Plus />
                New Request
              </Button>
            </RequestCreateEditDialog>
          </div>
        }
      />
      <div className="min-h-0 flex-1">
        <DashboardBoard projectId={projectId as never} type={boardType} />
      </div>
    </>
  )
}
