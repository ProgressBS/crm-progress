import { createClient } from '@/lib/supabase/server'
import { STAGES, STAGE_IDX, money } from '@/lib/constants'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: deals } = await supabase.from('deals').select('*').eq('archived', false)
  const { data: payments } = await supabase.from('payments').select('amount, pay_date')
  const list = deals || []
  const leads = list.filter(d => STAGE_IDX[d.stage] <= 1).length
  const inwork = list.filter(d => STAGE_IDX[d.stage] >= 2 && STAGE_IDX[d.stage] <= 5).length
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const revenue = (payments || []).filter(p => p.pay_date && new Date(p.pay_date) >= monthStart).reduce((a, p) => a + (Number(p.amount) || 0), 0)
  return (
    <div>
      <h1 className="page-h">Дашборд</h1>
      <div className="page-sub">PROGRESS BUSINESS SCHOOL</div>
      <div className="tiles">
        <div className="tile"><div className="lab">Лиды</div><div className="val tnum">{leads}</div></div>
        <div className="tile"><div className="lab">В работе</div><div className="val tnum">{inwork}</div></div>
        <div className="tile"><div className="lab">Всего сделок</div><div className="val tnum">{list.length}</div></div>
        <div className="tile"><div className="lab">Оплачено за месяц</div><div className="val tnum">{money(revenue)}</div></div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Воронка</h3>
        {STAGES.map(s => {
          const c = list.filter(d => d.stage === s.id).length
          const max = Math.max(1, ...STAGES.map(x => list.filter(d => d.stage === x.id).length))
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, fontSize: 13 }}>
              <span style={{ width: 150, color: 'var(--muted)' }}>{s.name}</span>
              <div style={{ height: 22, borderRadius: 6, width: (c / max * 100) + '%', minWidth: 3, background: `var(${s.v})`, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600 }}>{c || ''}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
