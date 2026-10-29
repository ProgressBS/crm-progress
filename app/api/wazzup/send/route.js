import { admin } from '@/lib/supabase/admin'
import { wz } from '@/lib/wazzup'

export const dynamic = 'force-dynamic'

// Send a WhatsApp message from the CRM via Wazzup, and log it to messages.
export async function POST(req) {
  let p
  try { p = await req.json() } catch { return Response.json({ ok: false, error: 'bad body' }, { status: 400 }) }
  const { chatId, channelId, text, deal_id, client_id, author } = p || {}
  if (!chatId || !channelId || !text) {
    return Response.json({ ok: false, error: 'chatId, channelId и text обязательны' }, { status: 400 })
  }

  const r = await wz('/message', 'POST', { channelId, chatId, chatType: 'whatsapp', text })
  if (!r.ok) return Response.json({ ok: false, error: r.data, status: r.status }, { status: 400 })

  const sb = admin()
  try {
    await sb.from('messages').insert({
      wazzup_id: r.data?.messageId || null,
      channel: channelId,
      chat_id: chatId,
      direction: 'out',
      text,
      deal_id: deal_id || null,
      client_id: client_id || null,
      author: author || null,
      ts: new Date().toISOString(),
    })
  } catch (e) {}

  return Response.json({ ok: true, messageId: r.data?.messageId || null })
}
