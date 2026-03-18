import { Outlet, createFileRoute } from '@tanstack/react-router'

import DashboardShell from '@/components/dashboard/DashboardShell'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  )
}
