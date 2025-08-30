'use client'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useStoreUserEffect } from '@effects/useStoreUserEffect'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '../convex/_generated/api'

export default function Home() {
  const { isLoading, isAuthenticated } = useStoreUserEffect()
  // const [message, setMessage] = useState()
  // const tasks = useQuery(api.tasks.get)

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const res = await fetch('/api/hello')
  //     const { message } = await res.json()
  //     setMessage(message)
  //   }
  //   fetchData()
  // }, [])

  // if (!message)
  //   return <p>Loading...</p>

  return (
    <div>
      {isLoading && 'loading'}
      {isAuthenticated && 'authenticated'}
      <Authenticated>
        <Link href="dashboard">dashboard</Link>
      </Authenticated>
      <Unauthenticated>
        <SignInButton></SignInButton>

      </Unauthenticated>
    </div>
  )
}
