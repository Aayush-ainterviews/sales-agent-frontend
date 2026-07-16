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
  onDelta?: (text: string) => void                      // streamed assistant text
  onTool?: (name: string, detail?: string) => void       // a tool started (detail = file path / command)
  onToolEnd?: (name: string, isError: boolean) => void
  onError?: (detail: string) => void
  onDone?: () => void
}

// Pull the human-relevant argument out of a tool_execution_start event: the file path
// for read/write/edit, the command for bash. Field name varies, so probe the usual keys.
function toolDetail(ev: any): string | undefined {
  const a =
    ev.arguments ?? ev.toolInput ?? ev.input ?? ev.args ?? ev.parameters ??
    ev.toolCall?.arguments ?? ev.tool?.arguments ?? ev.toolCall?.input
  if (a && typeof a === 'object') {
    const v =
      a.file_path ?? a.filePath ?? a.path ?? a.filename ?? a.file ??
      a.command ?? a.cmd ?? a.pattern
    if (typeof v === 'string') return v
  }
  return undefined
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
  let finished = false

  try {
    while (!finished) {
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
            h.onTool?.(ev.toolName ?? 'tool', toolDetail(ev))
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
            finished = true
            break
          // turn_start, heartbeat, message_start/end, etc. -> ignore
        }
        if (finished) break
      }
    }
  } catch (e) {
    // an intentional abort (Stop button) throws AbortError — not an error to surface
    if ((e as any)?.name !== 'AbortError') h.onError?.(String(e))
  } finally {
    h.onDone?.()
  }
}

// --- mid-turn controls (Q7) ---

// Stop the running turn. Best-effort; the client also aborts its own fetch.
export async function abortTurn(auth: Auth): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/abort`, {
      method: 'POST',
      headers: authHeaders(auth.token),
    })
    return r.ok
  } catch {
    return false
  }
}

// Inject a message into the CURRENTLY running turn. Returns false (409) if no turn
// is running — caller then falls back to sending it as a fresh turn.
export async function steerTurn(auth: Auth, message: string): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/steer`, {
      method: 'POST',
      headers: authHeaders(auth.token),
      body: JSON.stringify({ message }),
    })
    return r.ok
  } catch {
    return false
  }
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

// --- output file download (from the user's sandbox) ---

export interface Upload {
  path: string
  name: string
  size: number
}

// Upload a file into the user's sandbox (stored under uploads/). Returns its sandbox
// path so the caller can reference it in the next message. Throws with the HTTP status +
// body on failure so the UI can surface the real reason instead of silently doing nothing.
export async function uploadFile(auth: Auth, file: File): Promise<Upload> {
  const fd = new FormData()
  fd.append('file', file)
  // NOTE: don't set Content-Type — the browser adds the multipart boundary itself.
  let r: Response
  try {
    r = await fetch(`${BACKEND_URL}/users/${auth.userId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: fd,
    })
  } catch (e) {
    throw new Error(`network/CORS error: ${String(e)}`)
  }
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}${body ? ` — ${body.slice(0, 200)}` : ''}`)
  }
  return r.json()
}

// Fetch one output file (authenticated) as a Blob so the browser can save it.
// Returns null if the file is missing/unreadable.
export async function fetchFileBlob(auth: Auth, path: string): Promise<Blob | null> {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/file?path=${encodeURIComponent(path)}`, {
    headers: authHeaders(auth.token),
  })
  if (!r.ok) return null
  return r.blob()
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
