'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STAGE_IDX } from '@/lib/constants'
import { money, num } from '@/lib/format'

export default function Reports() {
  const supabase = createClient()
  const [deals, setDeals] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      const [d, p] = await Promise.all([
        supabase.from('deals').select('*').eq('archived', false),
        supabase.from('payments').select('*'),
      ])
      setDeals(d.data || []); setPayments(p.data || []); setLoading(false)
    })()
  }, [])
  if (loading) return <div><h1 className="page-h">Отчёты</h1><div style={{ color: 'var(--muted)' }}>Загрузка…</div></div>
  const total = Math.max(1, deals.length)
  const byM = {}; payments.forEach(p => { if (!p.pay_date) return; const k = p.pay_date.slice(0, 7); if (!byM[k]) byM[k] = { sum: 0, n: 0 }; byM[k].sum += Number(p.amount) || 0; byM[k].n++ })
  const months = Object.keys(byM).sort()
  const mx = Math.max(1, ...months.map(m => byM[m].sum))
  const byC = {}; deals.forEach(d => { const k = d.course_name || 'Без курса'; if (!byC[k]) byC[k] = { n: 0, sum: 0 }; byC[k].n++; byC[k].sum += Number(d.amount) || 0 })
  const ck = Object.keys(byC).sort((a, b) => byC[b].sum - byC[a].sum)
  return (
    <div>
      <h1 className="page-h">Отчёты</h1>
      <div className="page-sub">Аналитика продаж</div>
      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Воронка продаж</h3>
        {STAGES.map(s => {
          const c = deals.filter(d => STAGE_IDX[d.stage] >= STAGE_IDX[s.id]).length
          return <div key={s.id} className="funnel-row"><span className="fn">{s.name}</span>
            <div className="bar" style={{ width: (c / total * 100) + '%', background: `var(${s.v})` }}>{c}</div></div>
        })}
      </div>
      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Оплаты по месяцам</h3>
        {months.length === 0 ? <div style={{ color: 'var(--faint)', fontSize: 13 }}>Пока нет оплат.</div>
          : months.map(m => <div key={m} className="funnel-row"><span className="fn">{new Date(m + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}</span>
            <div className="bar" style={{ width: (byM[m].sum / mx * 100) + '%', background: 'var(--good)' }}>{money(byM[m].sum)}</div></div>)}
      </div>
      {ck.length > 0 && <div className="panel" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>По курсам</h3>
        <div className="tablewrap" style={{ border: 'none' }}><table className="table" style={{ border: 'none' }}>
          <thead><tr><th>Курс</th><th>Сделок</th><th>Сумма</th></tr></thead>
          <tbody>{ck.map(k => <tr key={k}><td><b>{k}</b></td><td>{num(byC[k].n)}</td><td>{money(byC[k].sum)}</td></tr>)}</tbody>
        </table></div>
      </div>}
    </div>
  )
}
