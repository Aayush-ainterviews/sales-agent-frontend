// Reject a batch.

import { BACKEND_URL, USER_ID, TOKEN } from '@/lib/backend'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const r = await fetch(`${BACKEND_URL}/users/${USER_ID}/batches/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    return Response.json(await r.json(), { status: r.status })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 502 })
  }
}
