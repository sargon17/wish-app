import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

import env from '@/env'

if (!env.VITE_CONVEX_URL) {
  throw new Error('Missing Convex URL. Set VITE_CONVEX_URL in apps/wish-start/.env.local')
}

const convex = new ConvexReactClient(env.VITE_CONVEX_URL)

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
