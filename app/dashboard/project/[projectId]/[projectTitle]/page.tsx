import type { Id } from '@/convex/_generated/dataModel'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import DashboardHeading from '@/components/Dashboard/DashboardHeading'
import ProjectPage from '@/components/Project/ProjectPage'
import RequestCreateEditDialog from '@/components/Request/RequestCreateEditDialog'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{
    projectId: string
    projectTitle: string
  }>
}

export default async function Page({ params }: Props) {
  const { projectId, projectTitle } = await params

  const cleanTitle = projectTitle.replaceAll('_', ' ')

  const breadcrumbs = [
    {
      label: 'home',
      url: '/',
    },
    {
      label: 'dashboard',
      url: '/dashboard',
    },
  ]

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="md:px-6 md:pt-6">
          <DashboardHeading
            title={cleanTitle}
            actions={(
              <RequestCreateEditDialog project={projectId as Id<'projects'>}>
                <Button className="shrink-0" variant="ghost">
                  <Plus />
                  New Request
                </Button>
              </RequestCreateEditDialog>
            )}
            breadcrumbs={breadcrumbs}
          />
        </div>
        <Suspense fallback="loading">
          <ProjectPage id={projectId} />
        </Suspense>
      </div>
    </>
  )
}
