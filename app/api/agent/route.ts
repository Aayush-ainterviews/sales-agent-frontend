// Streams a turn from the backend to the browser. The browser POSTs a message here
// (same-origin, no CORS); we forward it to the backend with the secret token and pipe
// the Server-Sent-Events stream straight back.

import { BACKEND_URL, USER_ID, TOKEN } from '@/lib/backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message : ''

  let upstream: Response
  try {
    upstream = await fetch(`${BACKEND_URL}/users/${USER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  } catch (e) {
    return sseError(`cannot reach backend: ${String(e)}`)
  }

  if (!upstream.ok || !upstream.body) {
    const detail = upstream.status === 409 ? 'a turn is already running' : `backend HTTP ${upstream.status}`
    return sseError(detail)
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

function sseError(detail: string): Response {
  const line = `data: ${JSON.stringify({ type: 'turn_error', reason: 'proxy', detail })}\n\n`
  return new Response(line, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}
