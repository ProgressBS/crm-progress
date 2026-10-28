import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'

export default async function DashLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let name = user?.email || ''
  if (user) {
    const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (p?.full_name) name = p.full_name
  }
  return (
    <div className="app">
      <Nav name={name} />
      <main className="main">{children}</main>
    </div>
  )
}
