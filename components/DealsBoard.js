'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STAGE_IDX, money } from '@/lib/constants'

export default function DealsBoard() {
  const supabase = createClient()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ client_name: '', course_name: '', amount: '' })

  async function load() {
    const { data } = await supabase.from('deals').select('*').eq('archived', false).order('created_at', { ascending: false })
    setDeals(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    if (!form.client_name) return
    await supabase.from('deals').insert({ client_name: form.client_name, course_name: form.course_name || null, amount: form.amount ? Number(form.amount) : null, stage: 'call' })
    setForm({ client_name: '', course_name: '', amount: '' }); load()
  }
  async function move(d, stage) { await supabase.from('deals').update({ stage, stage_at: new Date().toISOString() }).eq('id', d.id); load() }

  return (
    <div>
      <h1 className="page-h">Сделки</h1>
      <div className="page-sub">Воронка продаж — 8 стадий</div>
      <form className="row-form" onSubmit={add}>
        <input className="input" placeholder="Клиент" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
        <input className="input" placeholder="Курс" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
        <input className="input" type="number" placeholder="Сумма" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <button className="btn primary">+ Добавить</button>
      </form>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div> : (
        <div className="board">
          {STAGES.map(s => {
            const inCol = deals.filter(d => d.stage === s.id)
            return (
              <div key={s.id} className="col">
                <h3><span>{s.name}</span><span className="tnum" style={{ color: 'var(--muted)' }}>{inCol.length}</span></h3>
                {inCol.map(d => (
                  <div key={d.id} className="card" style={{ borderLeftColor: `var(${s.v})` }}>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>{d.client_name}</div>
                    {d.course_name && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{d.course_name}</div>}
                    <div className="tnum" style={{ fontWeight: 600, margin: '4px 0' }}>{d.amount ? money(d.amount) : '—'}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {STAGE_IDX[s.id] > 0 && <button className="btn sm" onClick={() => move(d, STAGES[STAGE_IDX[s.id] - 1].id)}>←</button>}
                      {STAGE_IDX[s.id] < 7 && <button className="btn sm" onClick={() => move(d, STAGES[STAGE_IDX[s.id] + 1].id)}>→</button>}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
