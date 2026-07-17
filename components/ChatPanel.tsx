'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2, Check, AlertTriangle, Square, CornerDownRight, X, Mail, Paperclip } from 'lucide-react'
import {
  streamAgent, abortTurn, steerTurn, listBatches, fetchFileBlob, uploadFile,
  fetchConversationMessages, conversationStatus,
  type Auth, type BatchSummary,
} from '@/lib/api'
import { useBackendAuth } from '@/lib/useBackend'
import { Markdown } from '@/components/Markdown'
import { parseMarkdownTables, type TableSource } from '@/lib/table'
import { Table as TableIcon } from 'lucide-react'

interface ToolCall {
  name: string
  done: boolean
  error?: boolean
  detail?: string
}

// keep the tail of a long path/command so the meaningful part (filename) stays visible
const short = (s: string, n = 42) => (s.length > n ? '…' + s.slice(-n) : s)

type BatchState = 'pending' | 'sending' | 'sent' | 'rejected' | 'failed'

interface Msg {
  id: string
  role: 'user' | 'assistant' | 'batch'
  content: string
  tools: ToolCall[]
  done: boolean
  steered?: boolean
  batch?: BatchSummary
  batchState?: BatchState
  batchNote?: string
}

const TOOL_LABEL: Record<string, string> = {
  bash: 'Running command',
  write: 'Writing file',
  read: 'Reading file',
  edit: 'Editing file',
}
const label = (name: string) => TOOL_LABEL[name] ?? name

// Real streaming chat with the backend agent, with Claude-style mid-turn controls:
// Stop (abort), queue-while-working, Steer (inject into the running turn), and inline
// email/batch approval cards.
export default function ChatPanel({
  cid,
  initialQuery,
  onShowTable,
  onOpenBatch,
  onTurnComplete,
}: {
  cid: string
  initialQuery?: string
  onShowTable?: (source: TableSource) => void
  onOpenBatch?: (batchId: string) => void
  onTurnComplete?: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [queued, setQueuedState] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<{ path: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const getAuth = useBackendAuth()

  const abortRef = useRef<AbortController | null>(null)
  const abortedRef = useRef(false)
  const queuedRef = useRef<string | null>(null)
  const shownBatches = useRef<Set<string>>(new Set())

  const setQueued = (v: string | null) => {
    queuedRef.current = v
    setQueuedState(v)
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true
      void runTurn(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  // Opening an existing conversation: load its saved message history (skip for a brand-new
  // conversation that has an initialQuery to send). Component is keyed by cid in the parent,
  // so this runs once per conversation.
  useEffect(() => {
    if (initialQuery) return
    let cancelled = false
    ;(async () => {
      const auth = await getAuth()
      if (!auth || cancelled) return
      const hist = await fetchConversationMessages(cid, auth)
      if (cancelled) return
      setMessages(
        hist.map((h, i) => ({ id: `h${i}`, role: h.role, content: h.content, tools: [], done: true })),
      )
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  const patchMsg = (id: string, fn: (x: Msg) => Msg) =>
    setMessages((m) => m.map((x) => (x.id === id ? fn(x) : x)))

  async function runTurn(text: string, opts?: { steered?: boolean }) {
    const t = text.trim()
    if (!t) return
    const auth = await getAuth()
    if (!auth) {
      setMessages((m) => [
        ...m,
        { id: 'e' + Date.now(), role: 'assistant', content: '⚠️ not signed in', tools: [], done: true },
      ])
      return
    }

    const userMsg: Msg = { id: 'u' + Date.now(), role: 'user', content: t, tools: [], done: true, steered: opts?.steered }
    const botId = 'a' + Date.now()
    const botMsg: Msg = { id: botId, role: 'assistant', content: '', tools: [], done: false }
    setMessages((m) => [...m, userMsg, botMsg])

    const patch = (fn: (x: Msg) => Msg) => patchMsg(botId, fn)

    setBusy(true)
    abortedRef.current = false
    const ctrl = new AbortController()
    abortRef.current = ctrl

    // Smooth "typewriter" reveal: network deltas arrive in bursts, so buffer them and
    // reveal a few characters per animation frame — feels like realtime streaming instead
    // of whole lines popping in. The chunk size scales with the backlog so it never lags.
    const rev = { buffer: '', raf: null as number | null }
    const pump = () => {
      if (!rev.buffer) { rev.raf = null; return }
      const n = Math.max(2, Math.ceil(rev.buffer.length / 5))
      const chunk = rev.buffer.slice(0, n)
      rev.buffer = rev.buffer.slice(n)
      patch((x) => ({ ...x, content: x.content + chunk }))
      rev.raf = requestAnimationFrame(pump)
    }
    const kick = () => { if (rev.raf == null) rev.raf = requestAnimationFrame(pump) }
    const flush = () => {
      if (rev.raf != null) { cancelAnimationFrame(rev.raf); rev.raf = null }
      if (rev.buffer) {
        const rest = rev.buffer
        rev.buffer = ''
        patch((x) => ({ ...x, content: x.content + rest }))
      }
    }
    let cleanEnd = true // set by onDone; false => stream cut before agent_end

    await streamAgent(
      cid,
      t,
      auth,
      {
        onDelta: (d) => { rev.buffer += d; kick() },
        onTool: (name, detail) => patch((x) => ({ ...x, tools: [...x.tools, { name, done: false, detail }] })),
        onToolEnd: (name, isError) =>
          patch((x) => {
            const tools = [...x.tools]
            for (let i = tools.length - 1; i >= 0; i--) {
              if (tools[i].name === name && !tools[i].done) {
                tools[i] = { ...tools[i], done: true, error: isError }
                break
              }
            }
            return { ...x, tools }
          }),
        onError: (detail) => {
          if (abortedRef.current) return
          flush()
          patch((x) => ({ ...x, content: (x.content ? x.content + '\n\n' : '') + '⚠️ ' + detail }))
        },
        onDone: (clean) => {
          flush() // reveal anything still buffered
          cleanEnd = clean
          if (clean) patch((x) => ({ ...x, done: true }))
          // if not clean, leave it "working" — recovery below finalizes it
        },
      },
      ctrl.signal,
    )

    abortRef.current = null

    // Stream ended WITHOUT agent_end (a long turn's SSE was cut, or the turn was already
    // running) — the backend turn is likely still going. Stay busy, poll until it finishes,
    // then load the result from history (so it appears without the user asking for it).
    if (!cleanEnd && !abortedRef.current) {
      await recoverTurn(botId)
    }

    setBusy(false)
    onTurnComplete?.() // refresh the sidebar (title may have just been set from the 1st message)

    // The backend collects draft batches from the sandbox outbox JUST AFTER agent_end (a
    // slow sandbox read), so a single immediate check races it and misses the batch. Poll
    // briefly in the background until one shows up (or give up). Each poll mints a fresh
    // token — a long turn's start-time token would be expired by now.
    void pollBatchesInline()

    // flush a message the user queued while this turn was running
    const q = queuedRef.current
    if (q) {
      setQueued(null)
      void runTurn(q)
    }
  }

  // add any new pending batches as approval cards; returns how many were added.
  // Mints its own fresh token each call (callers may run long after the turn started).
  async function loadBatchesInline(): Promise<number> {
    const auth = await getAuth()
    if (!auth) return 0
    try {
      const pend = await listBatches(auth, 'pending')
      const fresh = pend.filter((b) => !shownBatches.current.has(b.id))
      if (!fresh.length) return 0
      fresh.forEach((b) => shownBatches.current.add(b.id))
      setMessages((m) => [
        ...m,
        ...fresh.map<Msg>((b) => ({
          id: 'b' + b.id,
          role: 'batch',
          content: '',
          tools: [],
          done: true,
          batch: b,
          batchState: 'pending',
        })),
      ])
      return fresh.length
    } catch {
      return 0
    }
  }

  async function pollBatchesInline() {
    for (let i = 0; i < 6; i++) {
      if ((await loadBatchesInline()) > 0) return
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  // The live SSE stream ended before agent_end (cut, or the turn was already running). The
  // backend turn is likely still going — poll its status (staying "busy" so sends queue),
  // then load the finished turn's output from saved history so it shows without asking.
  async function recoverTurn(botId: string) {
    patchMsg(botId, (x) => ({ ...x, done: false })) // show "Working…" while we wait
    for (let i = 0; i < 600; i++) {                  // up to ~20 min (matches the backend watchdog)
      const auth = await getAuth()
      if (!auth) break
      if (!(await conversationStatus(cid, auth))) break // finished on the server
      await new Promise((r) => setTimeout(r, 2000))
    }
    const auth = await getAuth()
    const hist = auth ? await fetchConversationMessages(cid, auth) : []
    const lastAssistant = [...hist].reverse().find((h) => h.role === 'assistant')
    patchMsg(botId, (x) => ({
      ...x,
      content: lastAssistant ? lastAssistant.content : x.content || '⚠️ lost the live stream.',
      done: true,
    }))
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    setUploadError(null)
    const auth = await getAuth()
    if (!auth) {
      setUploadError('not signed in')
      return
    }
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        try {
          const res = await uploadFile(cid, auth, f)
          setAttachments((a) => [...a, { path: res.path, name: res.name }])
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setUploadError(`Upload failed (${f.name}): ${msg}`)
          console.error('upload failed', f.name, e)
        }
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = '' // allow re-picking the same file
    }
  }

  function onSubmit() {
    const t = input.trim()
    if (!t && attachments.length === 0) return
    const note = attachments.length
      ? `${t ? '\n\n' : ''}[Attached file${attachments.length > 1 ? 's' : ''}: ${attachments.map((a) => a.path).join(', ')}]`
      : ''
    const full = t + note
    setInput('')
    setAttachments([])
    if (busy) {
      setQueued(full) // hold it — auto-sends when the turn ends, or Steer to inject now
    } else {
      void runTurn(full)
    }
  }

  async function steerNow() {
    const t = queuedRef.current
    if (!t) return
    setQueued(null)
    const auth = await getAuth()
    if (!auth) return
    const ok = await steerTurn(cid, auth, t)
    if (ok) {
      // shown as a steered user turn; the agent folds it into the SAME running turn
      setMessages((m) => [...m, { id: 'u' + Date.now(), role: 'user', content: t, tools: [], done: true, steered: true }])
    } else {
      // turn already ended -> just run it as a fresh turn
      void runTurn(t)
    }
  }

  async function stop() {
    abortedRef.current = true
    // Signal the backend to abort the daemon FIRST — while the turn is still active it
    // returns 200 and actually stops it. (Aborting the client fetch first would disconnect
    // and race the release, so the explicit call then 409s and the daemon may keep going.)
    const auth = await getAuth()
    if (auth) await abortTurn(cid, auth)
    abortRef.current?.abort()
    setMessages((m) => m.map((x) => (x.role === 'assistant' && !x.done ? { ...x, done: true } : x)))
    setBusy(false)
  }

  async function downloadFile(path: string) {
    const auth = await getAuth()
    if (!auth) return
    const blob = await fetchFileBlob(cid, auth, path)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path.split('/').pop() || 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-foreground" />
        <h3 className="font-serif font-bold text-foreground">Agent</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the agent to find leads, research a company, or draft outreach.
          </p>
        )}

        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%]">
                  {m.steered && (
                    <div className="flex justify-end items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                      <CornerDownRight className="w-3 h-3" /> steered
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-lg text-sm bg-foreground text-background whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              </div>
            )
          }

          if (m.role === 'batch') {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[90%] w-full px-3 py-3 rounded-lg border border-border bg-secondary">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-foreground" />
                    <span className="font-serif font-bold text-foreground">Draft outreach ready</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {m.batch?.campaign || 'Untitled batch'} · {m.batch?.leads ?? 0} recipients
                  </p>
                  <button
                    onClick={() => m.batch && onOpenBatch?.(m.batch.id)}
                    className="mt-3 flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition"
                  >
                    <Mail className="w-4 h-4" /> Review &amp; send
                  </button>
                </div>
              </div>
            )
          }

          // assistant
          return (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[90%] px-3 py-2 rounded-lg bg-secondary border border-border text-foreground">
                {m.tools.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {m.tools.map((tool, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {tool.error ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        ) : tool.done ? (
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        )}
                        <span className={tool.done ? '' : 'text-foreground'}>{label(tool.name)}</span>
                        {tool.detail && (
                          <code className="font-mono text-[11px] text-muted-foreground truncate">{short(tool.detail)}</code>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {m.content && (
                  <Markdown
                    onDownload={downloadFile}
                    onTable={onShowTable ? (path) => onShowTable({ kind: 'file', path }) : undefined}
                  >
                    {m.content}
                  </Markdown>
                )}

                {/* open any table the agent RENDERED (markdown table) in the editable grid */}
                {m.done && onShowTable &&
                  parseMarkdownTables(m.content).map((t, ti) => (
                    <button
                      key={ti}
                      onClick={() => onShowTable({ kind: 'grid', name: t.title, grid: t.grid })}
                      className="mt-2 mr-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-background transition"
                    >
                      <TableIcon className="w-3.5 h-3.5" /> Show in table
                      <span className="text-muted-foreground">· {t.title}</span>
                    </button>
                  ))}

                {!m.done && (m.tools.length === 0 || m.tools[m.tools.length - 1].done) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="animate-pulse">{m.content ? 'Working…' : 'Thinking…'}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4 bg-background shrink-0">
        {/* queued message (typed while a turn is running) */}
        {queued && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary text-sm">
            <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate text-foreground">{queued}</span>
            <button
              onClick={() => void steerNow()}
              className="text-xs px-2 py-1 rounded-md border border-border hover:bg-background transition"
              title="Inject this into the running turn now"
            >
              Steer
            </button>
            <span className="text-[11px] text-muted-foreground">queued</span>
            <button onClick={() => setQueued(null)} title="Remove" className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* upload error (surfaced so failures aren't silent) */}
        {uploadError && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-foreground">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="flex-1 break-words">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* uploaded attachments (sent with the next message) */}
        {(attachments.length > 0 || uploading) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.path}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-border bg-secondary text-foreground"
              >
                <Paperclip className="w-3 h-3 text-muted-foreground" />
                <span className="max-w-[160px] truncate">{a.name}</span>
                <button
                  onClick={() => setAttachments((x) => x.filter((y) => y.path !== a.path))}
                  className="text-muted-foreground hover:text-foreground"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {uploading && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-border bg-secondary text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
              </span>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void onPickFiles(e.target.files)}
        />

        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach a file"
            className="p-2 bg-secondary border border-border text-foreground rounded-lg hover:bg-background transition disabled:opacity-50 shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? 'Steer or queue a message…' : 'Message the agent…'}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 text-sm"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => void stop()}
              title="Stop the current turn"
              className="p-2 bg-secondary border border-border text-foreground rounded-lg hover:bg-background transition shrink-0"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && attachments.length === 0}
              className="p-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
