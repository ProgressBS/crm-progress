import { wz } from '@/lib/wazzup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SB_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[^\x20-\x7E]/g, '').trim()

async function logOutgoing(row) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 7000)
  try {
    await fetch(SB_URL + '/rest/v1/rpc/ingest_messages', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: [row] }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
  } catch (e) {} finally { clearTimeout(t) }
}

// Send a WhatsApp message from the CRM via Wazzup, and log it to messages.
export async function POST(req) {
  let p
  try { p = await req.json() } catch { return Response.json({ ok: false, error: 'bad body' }, { status: 400 }) }
  const { chatId, channelId, text } = p || {}
  if (!chatId || !channelId || !text) {
    return Response.json({ ok: false, error: 'chatId, channelId и text обязательны' }, { status: 400 })
  }

  const r = await wz('/message', 'POST', { channelId, chatId, chatType: 'whatsapp', text })
  if (!r.ok) return Response.json({ ok: false, error: r.data, status: r.status }, { status: 400 })

  await logOutgoing({
    wazzup_id: r.data?.messageId || ('out-' + Date.now()),
    channel: channelId,
    chat_id: chatId,
    direction: 'out',
    text,
    ts: new Date().toISOString(),
  })

  return Response.json({ ok: true, messageId: r.data?.messageId || null })
}
