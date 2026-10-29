import { wz, APP_URL, wazzupKey } from '@/lib/wazzup'

export const dynamic = 'force-dynamic'

// One-time (idempotent) setup: registers our webhook URL with Wazzup and
// returns the list of channels (so we can see channelId for sending).
export async function GET() {
  if (!wazzupKey()) {
    return Response.json({
      ok: false,
      error: 'WAZZUP_API_KEY не задан. Добавьте его в Vercel → Settings → Environment Variables и сделайте redeploy.',
    })
  }

  try {
    const hook = await wz('/webhooks', 'PATCH', {
      webhooksUri: APP_URL + '/api/wazzup',
      subscriptions: { messagesAndStatuses: true, contactsAndDealsCreation: false },
    })

    const channels = await wz('/channels')

    return Response.json({
      ok: hook.ok,
      webhookUrl: APP_URL + '/api/wazzup',
      webhook: hook,
      channels: channels.data,
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message || e) }, { status: 200 })
  }
}
