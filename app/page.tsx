'use client'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useStoreUserEffect } from '@effects/useStoreUserEffect'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'
import Link from 'next/link'

export default function Home() {
  const { isLoading, isAuthenticated } = useStoreUserEffect()

  return (
    <div>
      {isLoading && 'loading'}
      {isAuthenticated && 'authenticated'}
      <Authenticated>
        <div className=" flex justify-between">
          <Link href="dashboard">dashboard</Link>
          <UserButton></UserButton>
        </div>
      </Authenticated>
      <Unauthenticated>
        <SignInButton></SignInButton>
      </Unauthenticated>
    </div>
  )
}
