'use client'

import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import type { Auth } from './api'

// Returns a STABLE getter that mints a fresh Clerk JWT (the "backend" template) plus the
// current user id. useCallback is essential: an unstable identity would re-fire every
// effect that lists it as a dependency (which infinite-loops the DataTable loader).
export function useBackendAuth() {
  const { getToken, userId } = useAuth()
  return useCallback(async (): Promise<Auth | null> => {
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
  }, [getToken, userId])
}
