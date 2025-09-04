'use client'
import { useQuery } from 'convex/react'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import CreateRequestDialog from '@/components/requests/CreateRequestDialog'
import { api } from '@/convex/_generated/api'
import DashboardBoard from '../dashboard/DashboardBoard'
import DashboardHeading from '../dashboard/DashboardHeading'
import { Button } from '../ui/button'

// // Lazy-load the board so its loading doesn’t block the page header
// const DashboardBoard = dynamic(() => import('../dashboard/DashboardBoard'), {
//   // Simple lightweight fallback while the board chunk loads
//   loading: () => (
//     <div className="flex h-full gap-2 w-full overflow-x-hidden px-2 md:px-6">
//       <div className="animate-pulse w-90 h-64 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30" />
//       <div className="animate-pulse w-90 h-64 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30" />
//       <div className="animate-pulse w-90 h-64 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30" />
//     </div>
//   ),
//   ssr: false,
// })

interface Props {
  id: string
}

export default function ProjectPage({ id }: Props) {
  const project = useQuery(api.projects.getProjectById, { id })

  if (!project)
    return

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
    <div className="flex flex-col h-full">
      <div className="md:px-6 md:pt-6">
        <DashboardHeading
          title={project?.title}
          actions={(
            <CreateRequestDialog project={project._id}>
              <Button className="shrink-0">
                New Request
              </Button>
            </CreateRequestDialog>
          )}
          breadcrumbs={breadcrumbs}
        />
      </div>
      <Suspense fallback={<div>loading</div>}>
        <DashboardBoard project={project} />
      </Suspense>
    </div>
  )
}
