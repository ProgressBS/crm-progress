export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SB_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[^\x20-\x7E]/g, '').trim()

// Direct REST insert into messages with a hard timeout so the function never hangs.
async function insertMessages(rows) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(SB_URL + '/rest/v1/messages', {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const text = await res.text()
    return { status: res.status, ok: res.ok, body: text.slice(0, 300) }
  } catch (e) {
    return { status: 0, ok: false, body: String(e && e.message || e) }
  } finally {
    clearTimeout(t)
  }
}

// Health check / Wazzup URL verification (GET)
export async function GET() {
  return Response.json({ ok: true, hook: 'wazzup', ts: new Date().toISOString() })
}

// Incoming webhook from Wazzup (messages + statuses)
export async function POST(req) {
  let body
  try { body = await req.json() } catch { return Response.json({ ok: true }) }
  if (body && body.test === true) return Response.json({ ok: true })

  const messages = Array.isArray(body?.messages) ? body.messages : []
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

  let result = { skipped: true }
  if (rows.length) result = await insertMessages(rows)

  return Response.json({ ok: true, result })
}
