'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ClientsTable() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ name: '', industry: '', phone: '', contact_person: '' })

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault(); if (!f.name) return
    await supabase.from('clients').insert({ name: f.name, industry: f.industry || null, phone: f.phone || null, contact_person: f.contact_person || null })
    setF({ name: '', industry: '', phone: '', contact_person: '' }); load()
  }
  async function del(id) { await supabase.from('clients').delete().eq('id', id); load() }

  return (
    <div>
      <h1 className="page-h">Клиенты</h1>
      <div className="page-sub">Компании и контакты</div>
      <form className="row-form" onSubmit={add}>
        <input className="input" placeholder="Название / ФИО" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="Отрасль" value={f.industry} onChange={e => setF({ ...f, industry: e.target.value })} />
        <input className="input" placeholder="Контактное лицо" value={f.contact_person} onChange={e => setF({ ...f, contact_person: e.target.value })} />
        <input className="input" placeholder="Телефон" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <button className="btn primary">+ Добавить</button>
      </form>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div> : rows.length === 0 ? <div style={{ color: 'var(--muted)' }}>Клиентов пока нет — добавьте первого.</div> : (
        <table className="table">
          <thead><tr><th>Название</th><th>Отрасль</th><th>Контакт</th><th>Телефон</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.industry || '—'}</td>
                <td>{r.contact_person || '—'}</td>
                <td className="tnum">{r.phone || '—'}</td>
                <td><button className="btn sm" onClick={() => del(r.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
