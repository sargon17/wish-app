import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'
import type { ReactNode } from 'react'

import env from '@/env'
import { Toaster } from '@/components/ui/sonner'

import ConvexClientProvider from './ConvexClientProvider'
import ThemeProvider from './ThemeProvider'

function AuthBoundary({ children }: { children: ReactNode }) {
  const key = env.VITE_CLERK_PUBLISHABLE_KEY

  if (!key) {
    return <>{children}</>
  }

  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>
}

export function HeaderAuth() {
  if (!env.VITE_CLERK_PUBLISHABLE_KEY) {
    return null
  }

  return (
    <>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
    </>
  )
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthBoundary>
      <ThemeProvider>
        <ConvexClientProvider>
          {children}
          <Toaster />
        </ConvexClientProvider>
      </ThemeProvider>
    </AuthBoundary>
  )
}
