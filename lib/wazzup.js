// Wazzup24 API v3 helper.
const BASE = 'https://api.wazzup24.com/v3'

export const APP_URL = process.env.APP_URL || 'https://crm-progress.vercel.app'

export function wazzupKey() {
  return process.env.WAZZUP_API_KEY || ''
}

export async function wz(path, method = 'GET', body) {
  const key = wazzupKey()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}
