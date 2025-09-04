import { Suspense } from 'react'
import DashboardView from '@/components/dashboard/DashboardView'

export default function Dashboard() {
  return (
    <>
      <Suspense fallback={<div>loading</div>}>
        <DashboardView />
      </Suspense>
    </>
  )
}
