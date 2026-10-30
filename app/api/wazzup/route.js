import { admin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Health check / Wazzup URL verification (GET)
export async function GET() {
  return Response.json({ ok: true, hook: 'wazzup', ts: new Date().toISOString() })
}

// Incoming webhook from Wazzup (messages + statuses)
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return Response.json({ ok: true }) }

  // Wazzup sends { test: true } when validating the webhook URL
  if (body && body.test === true) return Response.json({ ok: true })

  const sb = admin()
  const messages = Array.isArray(body?.messages) ? body.messages : []
  const statuses = Array.isArray(body?.statuses) ? body.statuses : []
  const debug = []

  const rows = []
  for (const m of messages) {
    if (!m || !m.messageId) continue
    rows.push({
      wazzup_id: m.messageId,
      channel: m.channelId || null,
      chat_id: m.chatId || null,
      contact_name: m.contact?.name || m.authorName || null,
      direction: m.isEcho ? 'out' : 'in',
      text: m.text || m.contentUri || '[вложение]',
      status: m.status || null,
      ts: m.dateTime || new Date().toISOString(),
    })
  }
  // (client matching by phone is done later / by a DB trigger — kept out of the
  // hot path so the webhook responds fast)
  if (rows.length) {
    try {
      const { error } = await sb.from('messages').upsert(rows, { onConflict: 'wazzup_id' })
      if (error) debug.push(error.message)
    } catch (e) { debug.push(String(e && e.message || e)) }
  }

  // delivery/read status updates
  for (const s of statuses) {
    if (!s || !s.messageId) continue
    try {
      await sb.from('messages').update({ status: s.status }).eq('wazzup_id', s.messageId)
    } catch (e) {}
  }

  return Response.json({ ok: true, inserted: debug.length ? 0 : rows.length, errors: debug })
}
