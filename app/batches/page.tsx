'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { listBatches, approveBatch, rejectBatch, type BatchSummary } from '@/lib/api'
import { useBackendAuth } from '@/lib/useBackend'
import { Search, ArrowLeft, RefreshCw, Check, X, Mail } from 'lucide-react'

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [note, setNote] = useState<string>('')
  const getAuth = useBackendAuth()

  async function load() {
    setLoading(true)
    try {
      const auth = await getAuth()
      setBatches(auth ? await listBatches(auth) : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onApprove(id: string) {
    setActing(id)
    setNote('')
    try {
      const auth = await getAuth()
      if (!auth) { setNote('Not signed in.'); return }
      const r = await approveBatch(auth, id)
      setNote(
        r?.ok
          ? `Sent: ${r.result?.sent ?? 0} · Failed: ${r.result?.failed ?? 0}`
          : `Failed: ${r?.detail || r?.error || 'unknown error'}`
      )
    } finally {
      setActing(null)
      void load()
    }
  }

  async function onReject(id: string) {
    setActing(id)
    setNote('')
    try {
      const auth = await getAuth()
      if (!auth) { setNote('Not signed in.'); return }
      await rejectBatch(auth, id)
      setNote('Batch rejected.')
    } finally {
      setActing(null)
      void load()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center">
                <Search className="w-5 h-5 text-background" />
              </div>
              <span className="font-serif text-xl font-bold text-foreground">Sales Agent</span>
            </div>
          </Link>
          <div className="flex gap-2 items-center">
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

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Pending approvals</h1>
            <p className="text-sm text-muted-foreground">Review draft outreach batches before they’re sent.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {note && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg bg-secondary border border-border text-foreground">{note}</div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Mail className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No pending batches. Ask the agent to draft outreach first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-serif font-bold text-foreground truncate">{b.campaign || 'Untitled batch'}</p>
                  <p className="text-sm text-muted-foreground">
                    {b.leads} {b.leads === 1 ? 'recipient' : 'recipients'} · id {b.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => void onReject(b.id)}
                    disabled={acting === b.id}
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => void onApprove(b.id)}
                    disabled={acting === b.id}
                  >
                    <Check className="w-4 h-4" />
                    {acting === b.id ? 'Sending…' : 'Approve & send'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
