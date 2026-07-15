'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react'
import { streamAgent } from '@/lib/api'
import { useBackendAuth } from '@/lib/useBackend'
import { Markdown } from '@/components/Markdown'

interface ToolCall {
  name: string
  done: boolean
  error?: boolean
}

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools: ToolCall[]
  done: boolean
}

// Friendly labels for the raw pi tool names shown in the activity feed.
const TOOL_LABEL: Record<string, string> = {
  bash: 'Running command',
  write: 'Writing file',
  read: 'Reading file',
  edit: 'Editing file',
}
const label = (name: string) => TOOL_LABEL[name] ?? name

// Real streaming chat with the backend agent. Optionally auto-sends `initialQuery`
// (e.g. the search box query) as the first message.
export default function ChatPanel({ initialQuery }: { initialQuery?: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const router = useRouter()
  const getAuth = useBackendAuth()

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true
      void send(initialQuery)
      // drop ?q= from the URL so a page refresh doesn't re-fire the same query
      // (which would hit the backend's one-turn-per-user 409).
      router.replace('/search')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  async function send(text: string) {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    const userMsg: Msg = { id: 'u' + Date.now(), role: 'user', content: t, tools: [], done: true }
    const botMsg: Msg = { id: 'a' + Date.now(), role: 'assistant', content: '', tools: [], done: false }
    setMessages((m) => [...m, userMsg, botMsg])
    setInput('')

    const patch = (fn: (x: Msg) => Msg) =>
      setMessages((m) => m.map((x) => (x.id === botMsg.id ? fn(x) : x)))

    const auth = await getAuth()
    if (!auth) {
      patch((x) => ({ ...x, content: '⚠️ not signed in', done: true }))
      setBusy(false)
      return
    }

    await streamAgent(t, auth, {
      onDelta: (d) => patch((x) => ({ ...x, content: x.content + d })),
      onTool: (name) => patch((x) => ({ ...x, tools: [...x.tools, { name, done: false }] })),
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
      onError: (detail) =>
        patch((x) => ({ ...x, content: (x.content ? x.content + '\n\n' : '') + '⚠️ ' + detail })),
      onDone: () => {
        patch((x) => ({ ...x, done: true }))
        setBusy(false)
      },
    })
    setBusy(false)
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
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-foreground text-background whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[90%] px-3 py-2 rounded-lg bg-secondary border border-border text-foreground">
                {/* live activity feed */}
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
                      </div>
                    ))}
                  </div>
                )}

                {/* streamed answer */}
                {m.content && <Markdown>{m.content}</Markdown>}

                {/* working indicator until the turn ends — only when no tool is actively
                    running (a running tool already shows its own spinner in the feed above) */}
                {!m.done && (m.tools.length === 0 || m.tools[m.tools.length - 1].done) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="animate-pulse">{m.content ? 'Working…' : 'Thinking…'}</span>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder={busy ? 'Agent is working…' : 'Message the agent…'}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="p-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
