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

  for (const m of messages) {
    if (!m || !m.messageId) continue
    const digits = String(m.chatId || '').replace(/\D/g, '')
    const tail = digits.slice(-9)

    // try to match an existing client by phone / whatsapp number
    let client_id = null
    if (tail) {
      try {
        const { data: c } = await sb
          .from('clients')
          .select('id')
          .or(`phone.ilike.%${tail}%,whatsapp.ilike.%${tail}%`)
          .limit(1)
        if (c && c[0]) client_id = c[0].id
      } catch (e) {}
    }

    const row = {
      wazzup_id: m.messageId,
      channel: m.channelId || null,
      chat_id: m.chatId || null,
      contact_name: m.contact?.name || m.authorName || null,
      direction: m.isEcho ? 'out' : 'in',
      text: m.text || m.contentUri || '[вложение]',
      status: m.status || null,
      ts: m.dateTime || new Date().toISOString(),
    }
    if (client_id) row.client_id = client_id

    try {
      const { error } = await sb.from('messages').upsert(row, { onConflict: 'wazzup_id' })
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

  return Response.json({ ok: true, inserted: messages.length - debug.length, errors: debug })
}
