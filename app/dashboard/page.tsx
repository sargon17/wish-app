import { Suspense } from 'react'
import DashboardHeading from '@/components/dashboard/DashboardHeading'
import DashboardView from '@/components/dashboard/DashboardView'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'

export default function Dashboard() {
  const breadcrumbs = [
    {
      label: 'home',
      url: '/',
    },
  ]

  return (
    <div className="md:px-6 pb-2 md:pt-6 flex flex-col h-screen">
      <DashboardHeading
        title="Dashboard"
        actions={<CreateProjectDialog>New Project</CreateProjectDialog>}
        breadcrumbs={breadcrumbs}
      />
      <Suspense fallback={<div>loading</div>}>
        <DashboardView />
      </Suspense>
    </div>

  )
}
