import DashboardHeading from '@/components/dashboard/DashboardHeading'
import ProjectPage from '@/components/project/ProjectPage'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { Button } from '@/components/ui/button'
import { Id } from '@/convex/_generated/dataModel'
import { Suspense } from 'react'

interface Props {
  params: Promise<{
    projectId: string,
    projectTitle: string
  }>
}

export default async function Page({ params }: Props) {
  const { projectId, projectTitle } = await params

  const cleanTitle = projectTitle.replaceAll("_", " ")

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
              <CreateRequestDialog project={projectId as Id<"projects">}>
                <Button className="shrink-0">
                  New Request
                </Button>
              </CreateRequestDialog>
            )}
            breadcrumbs={breadcrumbs}
          />
        </div>
        <Suspense fallback="loading">
          <ProjectPage id={projectId} />
          {/* <DashboardBoard project={project} /> */}
        </Suspense>
      </div>
    </>
  )
}
