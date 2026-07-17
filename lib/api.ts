// Browser-side client that talks to the backend DIRECTLY (direct-connect), passing a
// short-lived Clerk JWT as the bearer. Sandbox-scoped calls target a CONVERSATION
// (/conversations/{cid}/...); user-scoped calls (batches, conversation list) use the userId.

import { BACKEND_URL } from './backend'

export interface Auth {
  token: string
  userId: string
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// --- conversations (multi-session) ---

export interface Conversation {
  id: string
  title: string | null
  status: string
  updated_at: string | null
}

export async function listConversations(auth: Auth): Promise<Conversation[]> {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/conversations`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  if (!r.ok) return []
  return (await r.json()).conversations ?? []
}

export async function createConversation(auth: Auth): Promise<string | null> {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/conversations`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  if (!r.ok) return null
  return (await r.json()).id ?? null
}

export interface HistoryMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function fetchConversationMessages(cid: string, auth: Auth): Promise<HistoryMsg[]> {
  const r = await fetch(`${BACKEND_URL}/conversations/${cid}/messages`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  if (!r.ok) return []
  return (await r.json()).messages ?? []
}

export async function renameConversation(cid: string, auth: Auth, title: string): Promise<boolean> {
  const r = await fetch(`${BACKEND_URL}/conversations/${cid}`, {
    method: 'PATCH',
    headers: authHeaders(auth.token),
    body: JSON.stringify({ title }),
  })
  return r.ok
}

export async function deleteConversation(cid: string, auth: Auth): Promise<boolean> {
  const r = await fetch(`${BACKEND_URL}/conversations/${cid}`, {
    method: 'DELETE',
    headers: authHeaders(auth.token),
  })
  return r.ok
}

// --- turn streaming ---

export interface AgentHandlers {
  onDelta?: (text: string) => void                      // streamed assistant text
  onTool?: (name: string, detail?: string) => void       // a tool started (detail = file path / command)
  onToolEnd?: (name: string, isError: boolean) => void
  onError?: (detail: string) => void
  onDone?: (clean: boolean) => void                      // clean=true only if agent_end was received
}

// Is a turn currently running for this conversation? (used to recover from a cut stream)
export async function conversationStatus(cid: string, auth: Auth): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/conversations/${cid}/status`, {
      headers: authHeaders(auth.token),
      cache: 'no-store',
    })
    if (!r.ok) return false
    return !!(await r.json()).busy
  } catch {
    return false
  }
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

// Stream one turn in a conversation. Parses the SSE frames the backend emits (pi events).
export async function streamAgent(
  cid: string,
  message: string,
  auth: Auth,
  h: AgentHandlers,
  signal?: AbortSignal,
) {
  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/conversations/${cid}/messages`, {
      method: 'POST',
      headers: authHeaders(auth.token),
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (e) {
    h.onError?.(String(e))
    h.onDone?.(false)
    return
  }
  if (res.status === 409) {
    // a turn is already running for this conversation -> not an error; the caller recovers
    // (polls status, then reloads the result) instead of showing a scary bubble.
    h.onDone?.(false)
    return
  }
  if (!res.ok || !res.body) {
    h.onError?.(`HTTP ${res.status}`)
    h.onDone?.(false)
    return
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let sawText = false
  let finished = false
  let cleanEnd = false

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
            if (!sawText) {
              const text = finalText(ev)
              if (text) h.onDelta?.(text)
            }
            cleanEnd = true
            finished = true
            break
        }
        if (finished) break
      }
    }
  } catch (e) {
    if ((e as any)?.name !== 'AbortError') h.onError?.(String(e))
  } finally {
    h.onDone?.(cleanEnd)   // clean=false means the stream was cut before agent_end
  }
}

// --- mid-turn controls (Q7) ---

export async function abortTurn(cid: string, auth: Auth): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/conversations/${cid}/abort`, {
      method: 'POST',
      headers: authHeaders(auth.token),
    })
    return r.ok
  } catch {
    return false
  }
}

export async function steerTurn(cid: string, auth: Auth, message: string): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND_URL}/conversations/${cid}/steer`, {
      method: 'POST',
      headers: authHeaders(auth.token),
      body: JSON.stringify({ message }),
    })
    return r.ok
  } catch {
    return false
  }
}

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

// --- batch approval queue (per user, across conversations) ---

export interface BatchSummary {
  id: string
  campaign: string | null
  leads: number
  status: string
  user_id?: string
  conversation_id?: string | null
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

export interface BatchLead {
  email?: string
  name?: string
  subject?: string
  body?: string
  [k: string]: unknown
}
export interface BatchDetail {
  id: string
  status: string
  campaign: string | null
  leads: BatchLead[]
}

export async function getBatch(auth: Auth, id: string): Promise<BatchDetail | null> {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/batches/${id}`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  if (!r.ok) return null
  const j = await r.json().catch(() => ({}))
  const batch = (j.batch || {}) as { campaign?: string | null; leads?: BatchLead[] }
  return {
    id: j.id,
    status: j.status,
    campaign: batch.campaign ?? null,
    leads: Array.isArray(batch.leads) ? batch.leads : [],
  }
}

// Approve a batch. Default is TEST mode (send to test_email / SEND_OVERRIDE_TO), never real
// leads; pass { test: false } to send to the actual recipients.
export async function approveBatch(
  auth: Auth,
  id: string,
  opts?: { test?: boolean; testEmail?: string },
) {
  const r = await fetch(`${BACKEND_URL}/users/${auth.userId}/batches/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(auth.token),
    body: JSON.stringify({ test: opts?.test ?? true, test_email: opts?.testEmail ?? null }),
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

// --- files (a conversation's sandbox) ---

export interface Upload {
  path: string
  name: string
  size: number
}

export async function uploadFile(cid: string, auth: Auth, file: File): Promise<Upload> {
  const fd = new FormData()
  fd.append('file', file)
  // NOTE: don't set Content-Type — the browser adds the multipart boundary itself.
  let r: Response
  try {
    r = await fetch(`${BACKEND_URL}/conversations/${cid}/upload`, {
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

export async function fetchFileBlob(cid: string, auth: Auth, path: string): Promise<Blob | null> {
  const r = await fetch(`${BACKEND_URL}/conversations/${cid}/file?path=${encodeURIComponent(path)}`, {
    headers: authHeaders(auth.token),
  })
  if (!r.ok) return null
  return r.blob()
}

export async function fetchFileText(cid: string, auth: Auth, path: string): Promise<string | null> {
  const blob = await fetchFileBlob(cid, auth, path)
  return blob ? blob.text() : null
}

export async function writeFile(cid: string, auth: Auth, path: string, content: string): Promise<boolean> {
  const r = await fetch(`${BACKEND_URL}/conversations/${cid}/file`, {
    method: 'PUT',
    headers: authHeaders(auth.token),
    body: JSON.stringify({ path, content }),
  })
  return r.ok
}

// --- admin (role=admin): monitor all conversations + unstick ---

export interface AdminConversation {
  id: string
  user_id: string | null
  title: string | null
  sandbox_id: string | null
  status: string
  turn: { busy: boolean; busy_age_s?: number; active_sandbox?: string | null }
}

export async function adminConversations(auth: Auth): Promise<AdminConversation[]> {
  const r = await fetch(`${BACKEND_URL}/admin/conversations`, { headers: authHeaders(auth.token), cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).conversations ?? []
}

export async function adminBatches(auth: Auth, status = 'pending'): Promise<BatchSummary[]> {
  const r = await fetch(`${BACKEND_URL}/admin/batches?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(auth.token),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).batches ?? []
}

export async function adminReset(auth: Auth, cid: string) {
  const r = await fetch(`${BACKEND_URL}/admin/conversations/${encodeURIComponent(cid)}/reset`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}

export async function adminAbort(auth: Auth, cid: string) {
  const r = await fetch(`${BACKEND_URL}/admin/conversations/${encodeURIComponent(cid)}/abort`, {
    method: 'POST',
    headers: authHeaders(auth.token),
  })
  return r.json()
}
