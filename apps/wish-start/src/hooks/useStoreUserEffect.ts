import { useUser } from '@clerk/clerk-react'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useState } from 'react'

import { api } from '@/convex/api'

export function useStoreUserEffect() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const [storedUserId, setStoredUserId] = useState<string | null>(null)
  const storeUser = useMutation(api.users.store)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    async function createUser() {
      const id = await storeUser()
      setStoredUserId(String(id))
    }

    createUser()
    return () => setStoredUserId(null)
  }, [isAuthenticated, storeUser, user?.id])

  return {
    isLoading: isLoading || (isAuthenticated && storedUserId === null),
    isAuthenticated: isAuthenticated && storedUserId !== null,
  }
}
