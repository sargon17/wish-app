import { Authenticated, Unauthenticated } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'

import DashboardHeading from '@/components/dashboard/DashboardHeading'
import Loading from '@/components/Organisms/Loading'
import { StatsPageContent } from '@/components/stats/StatsPageContent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'

export const Route = createFileRoute('/dashboard/stats')({ component: StatsPage })

function StatsPage() {
  const { isLoading } = useStoreUserEffect()

  return (
    <ScrollArea className="min-h-0 flex-1 pr-1">
      <div className="flex h-screen min-h-0 flex-col pb-2 md:px-6 md:pt-6">
        <DashboardHeading
          title="Request stats"
          actions={null}
          breadcrumbs={[
            { label: "dashboard", url: "/dashboard" },
            { label: "stats", url: "/dashboard/stats" },
          ]}
        />
        {isLoading ? <Loading /> : null}
        {!isLoading ? (
          <>
            <Unauthenticated>
              <div className="px-2 text-sm text-muted-foreground">Sign in to view request stats.</div>
            </Unauthenticated>
            <Authenticated>
              <div className="pb-6">
                <StatsPageContent />
              </div>
            </Authenticated>
          </>
        ) : null}
      </div>
    </ScrollArea>
  )
}
