'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ENTITIES } from '@/lib/entities'
import { money, fdate } from '@/lib/format'

export default function CrudView({ entity }) {
  const cfg = ENTITIES[entity]
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // object or null
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)

  async function load() {
    const { data } = await supabase.from(cfg.table).select('*').order(cfg.order.col, { ascending: cfg.order.asc })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [entity])

  function openAdd() { setEditing({}); setOpen(true) }
  function openEdit(r) { setEditing(r); setOpen(true) }

  async function save(values) {
    const payload = {}
    cfg.fields.forEach(f => {
      let v = values[f.key]
      if (f.type === 'money' || f.type === 'number') v = (v === '' || v == null) ? null : Number(v)
      if (v === '') v = null
      payload[f.key] = v
    })
    if (editing && editing.id) await supabase.from(cfg.table).update(payload).eq('id', editing.id)
    else await supabase.from(cfg.table).insert(payload)
    setOpen(false); setEditing(null); load()
  }
  async function del(id) { await supabase.from(cfg.table).delete().eq('id', id); setConfirm(null); load() }

  const filtered = rows.filter(r => {
    if (!q) return true
    const s = q.toLowerCase()
    return cfg.columns.some(c => String(r[c.key] || '').toLowerCase().includes(s))
  })

  return (
    <div>
      <h1 className="page-h">{cfg.title}</h1>
      {cfg.subtitle && <div className="page-sub">{cfg.subtitle}</div>}
      <div className="toolbar">
        <input className="input search" placeholder="Поиск…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn primary" onClick={openAdd}>+ Добавить</button>
      </div>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : filtered.length === 0 ? <div className="empty">Пока пусто. Нажмите «+ Добавить».</div>
          : (
            <div className="tablewrap">
              <table className="table">
                <thead><tr>{cfg.columns.map(c => <th key={c.key}>{c.label}</th>)}<th></th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                      {cfg.columns.map(c => <td key={c.key}>{cell(r, c)}</td>)}
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn sm" onClick={() => setConfirm(r)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      {open && <FormModal cfg={cfg} values={editing} onSave={save} onClose={() => { setOpen(false); setEditing(null) }} />}
      {confirm && <ConfirmModal name={confirm[cfg.columns[0].key]} onYes={() => del(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function cell(r, c) {
  const v = r[c.key]
  if (c.link) { const href = c.link(r); return href ? <a className="btn sm" href={href} onClick={e => e.stopPropagation()}>{c.linkLabel || 'Открыть'}</a> : <span style={{ color: 'var(--faint)' }}>—</span> }
  if (c.money) return v ? money(v) : '—'
  if (c.date) return fdate(v)
  if (c.chip) return <span className={'chip ' + (c.chipColor ? c.chipColor(v) : '')}>{c.chip(v)}</span>
  if (c.bold) return <b>{v || '—'}</b>
  return v || '—'
}

export function FormModal({ cfg, values, onSave, onClose, title }) {
  const [v, setV] = useState(() => ({ ...(values || {}) }))
  const [err, setErr] = useState('')
  function set(k, val) { setV(p => ({ ...p, [k]: val })) }
  function submit(e) {
    e.preventDefault()
    for (const f of cfg.fields) if (f.required && !v[f.key]) { setErr('Заполните обязательные поля'); return }
    onSave(v)
  }
  return (
    <div className="overlay" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <div className="mh"><h3>{title || cfg.title}</h3><button type="button" className="x" onClick={onClose}>×</button></div>
        <div className="mb">
          <div className="form-grid">
            {cfg.fields.map(f => (
              <div key={f.key} className={'field' + (f.full ? ' full' : '')}>
                <label>{f.label}{f.required ? ' *' : ''}</label>
                {f.type === 'select'
                  ? <select value={v[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                    <option value=""></option>
                    {f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return <option key={ov} value={ov}>{ol}</option> })}
                  </select>
                  : f.type === 'textarea'
                    ? <textarea value={v[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
                    : <input type={f.type === 'money' ? 'number' : (f.type || 'text')} value={v[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />}
              </div>
            ))}
          </div>
          {err && <div style={{ color: 'var(--bad)', fontSize: 13 }}>{err}</div>}
        </div>
        <div className="mf"><button type="button" className="btn" onClick={onClose}>Отмена</button><button className="btn primary">Сохранить</button></div>
      </form>
    </div>
  )
}

export function ConfirmModal({ name, onYes, onClose }) {
  return (
    <div className="overlay" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal" style={{ width: 'min(400px,100%)' }}>
        <div className="mb"><h3 style={{ fontSize: 15, marginBottom: 8 }}>Удалить?</h3><p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>«{name}»</p></div>
        <div className="mf"><button className="btn" onClick={onClose}>Отмена</button><button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={onYes}>Удалить</button></div>
      </div>
    </div>
  )
}
