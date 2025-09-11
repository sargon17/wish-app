import DashboardHeading from '@/components/dashboard/DashboardHeading'
import DashboardView from '@/components/dashboard/DashboardView'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { Button } from '@components/ui/button'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'

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
        actions={(
          <CreateProjectDialog>
            <Button variant="ghost">
              <Plus />
              New Project
            </Button>
          </CreateProjectDialog>
        )}
        breadcrumbs={breadcrumbs}
      />
      <Suspense fallback={<div>loading</div>}>
        <DashboardView />
      </Suspense>
    </div>

  )
}
