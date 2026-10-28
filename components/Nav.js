'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const items = [['/', 'Дашборд'], ['/deals', 'Сделки'], ['/clients', 'Клиенты'], ['/courses', 'Курсы']]

export default function Nav({ name }) {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function signOut() { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="logo">П</div>
        <div><b>Прогресс</b><span>CRM школы</span></div>
      </div>
      {items.map(([href, label]) => (
        <Link key={href} href={href} className={'navlink' + (path === href ? ' active' : '')}>{label}</Link>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--faint)', padding: '0 11px 8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={signOut}>Выйти</button>
      </div>
    </nav>
  )
}
