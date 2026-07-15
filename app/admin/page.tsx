'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useBackendAuth } from '@/lib/useBackend'
import {
  adminUsers, adminBatches, adminReset, adminAbort,
  type AdminUser, type BatchSummary,
} from '@/lib/api'
import { Shield, ArrowLeft, RefreshCw, Loader2, RotateCcw, Square } from 'lucide-react'

export default function AdminPage() {
  const { user, isLoaded } = useUser()
  const isAdmin = user?.publicMetadata?.role === 'admin'
  const getAuth = useBackendAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [err, setErr] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const auth = await getAuth()
      if (!auth) { setErr('Not signed in.'); return }
      const [u, b] = await Promise.all([adminUsers(auth), adminBatches(auth, 'pending')])
      setUsers(u)
      setBatches(b)
    } catch (e) {
      setErr(String(e))
    } finally {
      setLoading(false)
    }
  }, [getAuth])

  useEffect(() => {
    if (isLoaded && isAdmin) void load()
  }, [isLoaded, isAdmin, load])

  async function onReset(userId: string) {
    setActing(userId)
    try {
      const auth = await getAuth()
      if (auth) await adminReset(auth, userId)
    } finally {
      setActing(null)
      void load()
    }
  }

  async function onAbort(userId: string) {
    setActing(userId)
    try {
      const auth = await getAuth()
      if (auth) await adminAbort(auth, userId)
    } finally {
      setActing(null)
      void load()
    }
  }

  if (isLoaded && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Shield className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">Admins only.</p>
        <Link href="/search?q="><Button variant="outline" size="sm">Back to agent</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <span className="font-serif text-xl font-bold text-foreground">Admin</span>
          </div>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ThemeSwitcher />
            <Link href="/search?q=">
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Agent
              </Button>
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {err && (
          <div className="text-sm px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-foreground">{err}</div>
        )}

        {/* Users */}
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground mb-4">Users</h2>
          {loading && users.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Sandbox</th>
                    <th className="px-4 py-2 font-medium">Turn</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-foreground">{u.user_id}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {u.sandbox_id ? <span className="font-mono text-xs">{u.sandbox_id.slice(0, 12)}</span> : '—'}
                        <span className="ml-2 text-xs">({u.status})</span>
                      </td>
                      <td className="px-4 py-2">
                        {u.turn.busy ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            busy {u.turn.busy_age_s != null ? `· ${u.turn.busy_age_s}s` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">idle</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm" variant="outline" className="gap-1"
                            onClick={() => void onAbort(u.user_id)}
                            disabled={acting === u.user_id || !u.turn.busy}
                            title="Stop the running turn (frees the slot)"
                          >
                            <Square className="w-3.5 h-3.5" /> Abort
                          </Button>
                          <Button
                            size="sm" variant="outline" className="gap-1"
                            onClick={() => void onReset(u.user_id)}
                            disabled={acting === u.user_id}
                            title="Clear slot + reprovision the sandbox"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending batches (all users) — monitor only */}
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground mb-4">Pending batches (all users)</h2>
          {batches.length === 0 ? (
            <p className="text-muted-foreground">None pending.</p>
          ) : (
            <div className="space-y-2">
              {batches.map((b) => (
                <div key={b.id} className="p-3 rounded-lg border border-border flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-foreground truncate">{b.campaign || 'Untitled batch'}</p>
                    <p className="text-xs text-muted-foreground">
                      user <span className="font-mono">{b.user_id}</span> · {b.leads} recipients · id {b.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Approvals are done by each user on their own Approvals page — admin is monitor + reset only.
          </p>
        </section>
      </div>
    </div>
  )
}
