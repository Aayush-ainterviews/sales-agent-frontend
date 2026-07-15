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
    // Prefer the "backend" JWT template (carries the `role` claim for admin). If it
    // isn't configured in Clerk yet, fall back to the default session token so regular
    // streaming still works — only admin-role gating needs the template's claim.
    let token: string | null = null
    try {
      token = await getToken({ template: 'backend' })
    } catch {
      token = await getToken()
    }
    if (!token) return null
    return { token, userId }
  }
}
