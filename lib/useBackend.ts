'use client'

import { useAuth } from '@clerk/nextjs'
import type { Auth } from './api'

// Returns a getter that mints a fresh Clerk JWT (the "backend" template) plus the
// current user id — everything the direct-connect API calls need to authenticate.
// Call it right before each request so the token is always fresh.
export function useBackendAuth() {
  const { getToken, userId } = useAuth()
  return async (): Promise<Auth | null> => {
    if (!userId) return null
    const token = await getToken({ template: 'backend' })
    if (!token) return null
    return { token, userId }
  }
}
