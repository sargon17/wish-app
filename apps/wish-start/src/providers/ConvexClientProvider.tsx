import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'

import env from '@/env'

const convex = env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL)
  : null

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
