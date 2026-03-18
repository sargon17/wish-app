import { Authenticated, Unauthenticated } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'

import DashboardHeading from '@/components/dashboard/DashboardHeading'
import Loading from '@/components/Organisms/Loading'
import { WaitlistTable } from '@/components/waitlist/WaitlistTable'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

export const Route = createFileRoute('/dashboard/waitlist')({ component: WaitlistPage })

function WaitlistPage() {
  const { isLoading } = useStoreUserEffect()

  return (
    <div className="flex h-screen flex-col pb-2 md:px-6 md:pt-6">
      <DashboardHeading
        title="Waitlist"
        actions={null}
        breadcrumbs={[{ label: "dashboard", url: "/dashboard" }]}
      />
      {isLoading ? <Loading /> : null}
      {!isLoading ? (
        <>
          <Unauthenticated>
            <div className="px-2 text-sm text-muted-foreground">Sign in to manage the waitlist.</div>
          </Unauthenticated>
          <Authenticated>
            <WaitlistTable />
          </Authenticated>
        </>
      ) : null}
    </div>
  )
}
