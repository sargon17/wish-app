import DashboardHeading from '@/components/dashboard/DashboardHeading'
import ProjectPage from '@/components/project/ProjectPage'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { sluggedText } from '@/lib/slug'
import { fetchQuery } from 'convex/nextjs'
import { Suspense } from 'react'

// export async function generateStaticParams() {
//   const projects = await fetchQuery(api.projects.getProjectsForUser)

//   if (!(projects && projects.length > 0)) {
//     return []
//   }

//   return projects.map(project => ({
//     projectId: project._id,
//     projectTitle: sluggedText(project.title)
//   }))
// }

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
