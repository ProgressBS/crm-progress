import { wz } from '@/lib/wazzup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Returns the Wazzup channels (so the UI can label chats by phone number).
export async function GET() {
  const r = await wz('/channels')
  const list = Array.isArray(r.data) ? r.data : []
  return Response.json({
    ok: r.ok,
    channels: list.map(c => ({
      channelId: c.channelId,
      phone: c.plainId || c.name || '',
      transport: c.transport,
      state: c.state,
    })),
  })
}
