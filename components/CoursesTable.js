'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/constants'

export default function CoursesTable() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ name: '', hours: '', price: '' })
  async function load() {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault(); if (!f.name) return
    await supabase.from('courses').insert({ name: f.name, hours: f.hours ? Number(f.hours) : null, price: f.price ? Number(f.price) : null })
    setF({ name: '', hours: '', price: '' }); load()
  }
  async function del(id) { await supabase.from('courses').delete().eq('id', id); load() }
  return (
    <div>
      <h1 className="page-h">Курсы</h1>
      <div className="page-sub">Каталог программ</div>
      <form className="row-form" onSubmit={add}>
        <input className="input" placeholder="Название курса" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="input" type="number" placeholder="Часов" value={f.hours} onChange={e => setF({ ...f, hours: e.target.value })} />
        <input className="input" type="number" placeholder="Стоимость" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />
        <button className="btn primary">+ Добавить</button>
      </form>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div> : rows.length === 0 ? <div style={{ color: 'var(--muted)' }}>Каталог пуст.</div> : (
        <table className="table">
          <thead><tr><th>Курс</th><th>Часов</th><th>Стоимость</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}><td style={{ fontWeight: 600 }}>{r.name}</td><td className="tnum">{r.hours || '—'}</td><td className="tnum">{r.price ? money(r.price) : '—'}</td><td><button className="btn sm" onClick={() => del(r.id)}>✕</button></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
