// Browser-side client that talks to the backend DIRECTLY (direct-connect), passing a
// short-lived Clerk JWT as the bearer. No same-origin proxy, so no 60s function cap —
// long agent turns stream to completion. Get `auth` from useBackendAuth().

import { BACKEND_URL } from './backend'

export interface Auth {
  token: string
  userId: string
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export interface AgentHandlers {
  onDelta?: (text: string) => void       // streamed assistant text
  onTool?: (name: string) => void         // a tool started running
  onToolEnd?: (name: string, isError: boolean) => void
  onError?: (detail: string) => void
  onDone?: () => void
}

// Stream one turn. Parses the SSE frames the backend emits (pi events).
export async function streamAgent(
  message: string,
  auth: Auth,
  h: AgentHandlers,
  signal?: AbortSignal,
) {
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/users/${auth.userId}/messages`, {
      method: 'POST',
      headers: authHeaders(auth.token),
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (e) {
    h.onError?.(String(e))
    h.onDone?.()
    return
  }
  if (res.status === 409) {
    h.onError?.('a turn is already running')
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

// --- batch approval queue (own batches) ---

export interface BatchSummary {
  id: string
  campaign: string | null
  leads: number
  status: string
  user_id?: string
  result?: { sent?: number; failed?: number } | null
}

export async function listBatches(auth: Auth, status = 'pending'): Promise<BatchSummary[]> {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/batches?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  const j = await r.json().catch(() => ({}))
  return j.batches ?? []
}

export async function approveBatch(auth: Auth, id: string) {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/batches/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}

export async function rejectBatch(auth: Auth, id: string) {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/batches/${id}/reject`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}

// --- admin (role=admin): monitor all users + unstick ---

export interface AdminUser {
  user_id: string
  sandbox_id: string | null
  status: string
  updated_at?: string | null
  turn: { busy: boolean; busy_age_s?: number; active_sandbox?: string | null }
}

export async function adminUsers(auth: Auth): Promise<AdminUser[]> {
  const r = await fetch(`${BACKEND_URL}/admin/users`, { headers: authHeaders(auth.token), cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).users ?? []
}

export async function adminBatches(auth: Auth, status = 'pending'): Promise<BatchSummary[]> {
  const r = await fetch(`${BACKEND_URL}/admin/batches?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).batches ?? []
}

export async function adminReset(auth: Auth, userId: string) {
  const r = await fetch(`${BACKEND_URL}/admin/users/${encodeURIComponent(userId)}/reset`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}

export async function adminAbort(auth: Auth, userId: string) {
  const r = await fetch(`${BACKEND_URL}/admin/users/${encodeURIComponent(userId)}/abort`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}
