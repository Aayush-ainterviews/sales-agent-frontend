'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Wrench } from 'lucide-react'
import { streamAgent } from '@/lib/api'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: string[]
}

// Real streaming chat with the backend agent. Optionally auto-sends `initialQuery`
// (e.g. the search box query) as the first message.
export default function ChatPanel({ initialQuery }: { initialQuery?: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const router = useRouter()

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
    const userMsg: Msg = { id: 'u' + Date.now(), role: 'user', content: t }
    const botMsg: Msg = { id: 'a' + Date.now(), role: 'assistant', content: '', tools: [] }
    setMessages((m) => [...m, userMsg, botMsg])
    setInput('')

    const patch = (fn: (x: Msg) => Msg) =>
      setMessages((m) => m.map((x) => (x.id === botMsg.id ? fn(x) : x)))

    await streamAgent(t, {
      onDelta: (d) => patch((x) => ({ ...x, content: x.content + d })),
      onTool: (name) => patch((x) => ({ ...x, tools: [...(x.tools || []), name] })),
      onError: (detail) =>
        patch((x) => ({ ...x, content: (x.content ? x.content + '\n\n' : '') + '⚠️ ' + detail })),
      onDone: () => setBusy(false),
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
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                m.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-secondary border border-border text-foreground'
              }`}
            >
              {m.tools && m.tools.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.tools.map((tool, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background/60 border border-border text-muted-foreground"
                    >
                      <Wrench className="w-3 h-3" /> {tool}
                    </span>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">
                {m.content || (m.role === 'assistant' && busy ? '…' : '')}
              </p>
            </div>
          </div>
        ))}
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
