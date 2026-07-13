// Browser-side client for the backend, via same-origin /api/* proxy routes.
// The bearer token stays server-side (in the route handlers) — never here.

export interface AgentHandlers {
  onDelta?: (text: string) => void       // streamed assistant text
  onTool?: (name: string) => void         // a tool started running
  onToolEnd?: (name: string, isError: boolean) => void
  onError?: (detail: string) => void
  onDone?: () => void
}

// Stream one turn. Parses the SSE frames the backend emits (pi events).
export async function streamAgent(message: string, h: AgentHandlers, signal?: AbortSignal) {
  let res: Response
  try {
    res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (e) {
    h.onError?.(String(e))
    h.onDone?.()
    return
  }
  if (!res.ok || !res.body) {
    h.onError?.(`HTTP ${res.status}`)
    h.onDone?.()
    return
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let sawText = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })

    let sep: number
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue

      let ev: any
      try {
        ev = JSON.parse(dataLine.slice(dataLine.indexOf(':') + 1).trim())
      } catch {
        continue
      }

      switch (ev.type) {
        case 'message_update':
          if (ev.assistantMessageEvent?.type === 'text_delta') {
            sawText = true
            h.onDelta?.(ev.assistantMessageEvent.delta ?? '')
          }
          break
        case 'tool_execution_start':
          h.onTool?.(ev.toolName ?? 'tool')
          break
        case 'tool_execution_end':
          h.onToolEnd?.(ev.toolName ?? 'tool', !!ev.isError)
          break
        case 'turn_error':
          h.onError?.(ev.detail ?? ev.reason ?? 'error')
          break
        case 'agent_end':
          // fallback: if no streamed deltas arrived, render the final assistant text
          if (!sawText) {
            const text = finalText(ev)
            if (text) h.onDelta?.(text)
          }
          h.onDone?.()
          return
        // turn_start, heartbeat, message_start/end, etc. -> ignore
      }
    }
  }
  h.onDone?.()
}

// Pull the last assistant message's text out of an agent_end event (fallback path).
function finalText(agentEnd: any): string {
  const msgs = agentEnd?.messages
  if (!Array.isArray(msgs)) return ''
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m?.role === 'assistant' && Array.isArray(m.content)) {
      const parts = m.content.filter((c: any) => c?.type === 'text').map((c: any) => c.text)
      if (parts.length) return parts.join('')
    }
  }
  return ''
}

// --- batch approval queue ---

export interface BatchSummary {
  id: string
  campaign: string | null
  leads: number
  status: string
  result?: { sent?: number; failed?: number } | null
}

export async function listBatches(status = 'pending'): Promise<BatchSummary[]> {
  const r = await fetch(`/api/batches?status=${encodeURIComponent(status)}`, { cache: 'no-store' })
  const j = await r.json().catch(() => ({}))
  return j.batches ?? []
}

export async function approveBatch(id: string) {
  const r = await fetch(`/api/batches/${id}/approve`, { method: 'POST' })
  return r.json()
}

export async function rejectBatch(id: string) {
  const r = await fetch(`/api/batches/${id}/reject`, { method: 'POST' })
  return r.json()
}
