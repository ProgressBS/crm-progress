import { createClient } from '@supabase/supabase-js'

// Server-side client for webhook/API routes that run without a user session.
// Uses the public anon key together with dedicated anon RLS policies on the
// messages table (anon_insert_messages / anon_update_messages), so no extra
// secret is required. Sanitise the key to drop any stray non-ASCII characters
// that could break the request headers.
export function admin() {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[^\x20-\x7E]/g, '').trim()
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
