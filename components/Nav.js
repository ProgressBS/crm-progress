'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const I = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9',
  chat: 'M4 5h16v11H8l-4 4V5z',
  deals: 'M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4',
  cal: 'M4 6h16v15H4V6zm0 5h16M8 3v4m8-4v4',
  reg: 'M5 4h11l3 3v13H5V4zm2 6h8M7 14h8M7 18h5',
  rep: 'M4 20h16M7 16V9m5 7V5m5 11v-8',
}
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="19" height="19"><path d={d} /></svg>
)

const ITEMS = [
  ['/', 'Сегодня', I.home],
  ['/feed', 'Клиенты и чаты', I.chat],
  ['/deals', 'Сделки', I.deals],
  ['/schedule', 'Расписание', I.cal],
  ['/registry', 'Реестры', I.reg],
  ['/reports', 'Отчёты', I.rep],
]

export default function Nav({ name }) {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function signOut() { await supabase.auth.signOut(); router.push('/login'); router.refresh() }
  const isActive = href => href === '/' ? path === '/' : path.startsWith(href)
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="logo">П</div>
        <div><b>Прогресс</b><span>Бизнес-школа · CRM</span></div>
      </div>
      <div className="navlinks">
        {ITEMS.map(([href, label, d]) => (
          <Link key={href} href={href} className={'navlink' + (isActive(href) ? ' active' : '')}>
            <Icon d={d} /><span>{label}</span>
          </Link>
        ))}
      </div>
      <div className="navfoot">
        <div className="navuser" title={name}>{name}</div>
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={signOut}>Выйти</button>
      </div>
    </nav>
  )
}
