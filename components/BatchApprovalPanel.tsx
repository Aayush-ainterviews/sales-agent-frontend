'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, X, Mail, Check, AlertTriangle, FlaskConical } from 'lucide-react'
import { useBackendAuth } from '@/lib/useBackend'
import { getBatch, approveBatch, rejectBatch, type BatchDetail } from '@/lib/api'

// Side panel to review + send an outreach batch. Test mode is ON by default (every email
// goes to one test inbox); untick it to send to the real recipients.
export default function BatchApprovalPanel({
  batchId,
  onClose,
  onResolved,
}: {
  batchId: string
  onClose: () => void
  onResolved?: () => void
}) {
  const getAuth = useBackendAuth()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [test, setTest] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = await getAuth()
      if (!auth) { setError('not signed in'); return }
      const b = await getBatch(auth, batchId)
      if (!b) { setError('batch not found'); return }
      setBatch(b)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [batchId, getAuth])

  useEffect(() => { void load() }, [load])

  async function approve() {
    if (test && !testEmail.trim()) {
      // allow empty only if the backend has a default; warn the user to be explicit
      setNote('Enter a test email (or untick Test to send to real recipients).')
      return
    }
    setBusy(true)
    setNote('')
    try {
      const auth = await getAuth()
      if (!auth) { setNote('not signed in'); return }
      const r = await approveBatch(auth, batchId, { test, testEmail: testEmail.trim() || undefined })
      if (r?.ok) {
        const sent = r.result?.sent ?? 0
        const failed = r.result?.failed ?? 0
        setNote(`${test ? 'Test sent' : 'Sent'}: ${sent} · Failed: ${failed}`)
        setDone(true)
        onResolved?.()
      } else {
        setNote(r?.detail || r?.error || 'Send failed')
      }
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    setBusy(true)
    setNote('')
    try {
      const auth = await getAuth()
      if (!auth) { setNote('not signed in'); return }
      await rejectBatch(auth, batchId)
      setNote('Rejected.')
      setDone(true)
      onResolved?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* header */}
      <div className="border-b border-border p-3 flex items-center gap-2 shrink-0">
        <Mail className="w-5 h-5 text-foreground" />
        <div className="min-w-0">
          <div className="font-serif font-bold text-foreground truncate">
            {batch?.campaign || 'Approval queue'}
          </div>
          {batch && (
            <div className="text-xs text-muted-foreground">
              {batch.leads.length} {batch.leads.length === 1 ? 'recipient' : 'recipients'} · {batch.status}
            </div>
          )}
        </div>
        <button onClick={onClose} title="Close" className="ml-auto p-1.5 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-auto min-h-0 p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <>
            {/* test controls */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} className="accent-foreground" />
                <FlaskConical className="w-4 h-4 text-foreground" />
                Send to a test email (recommended)
              </label>
              {test ? (
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@yourcompany.com"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm"
                />
              ) : (
                <div className="flex items-center gap-2 text-xs text-red-500">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> This will email the REAL recipients.
                </div>
              )}
            </div>

            {/* drafts */}
            {batch?.leads.map((lead, i) => (
              <div key={i} className="rounded-lg border border-border">
                <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
                  To: <span className="text-foreground">{lead.email || '—'}</span>
                  {lead.name ? <span className="ml-1">({lead.name})</span> : null}
                </div>
                <div className="px-3 py-2">
                  <div className="text-xs text-muted-foreground">Subject</div>
                  <div className="text-sm font-medium text-foreground mb-2">{lead.subject || '—'}</div>
                  <div className="text-xs text-muted-foreground">Message</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap break-words">{lead.body || '—'}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-border p-3 shrink-0 space-y-2">
        {note && <div className="text-sm text-muted-foreground">{note}</div>}
        {!done && batch && (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => void reject()}
              disabled={busy}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => void approve()}
              disabled={busy}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {test ? 'Send test' : 'Approve & send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
