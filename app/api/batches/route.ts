// List the user's batches (default: pending) — the approval queue.

import { BACKEND_URL, USER_ID, TOKEN } from '@/lib/backend'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get('status') || 'pending'
  try {
    const r = await fetch(`${BACKEND_URL}/users/${USER_ID}/batches?status=${encodeURIComponent(status)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    })
    return Response.json(await r.json(), { status: r.status })
  } catch (e) {
    return Response.json({ batches: [], error: String(e) }, { status: 502 })
  }
}
