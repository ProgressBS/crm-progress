'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fdate } from '@/lib/format'

export default function Tasks() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState('')
  const [f, setF] = useState({ title: '', due: '', assignee: '', deal_name: '' })

  async function load() {
    const { data } = await supabase.from('tasks').select('*').order('due', { ascending: true })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || ''))
  }, [])

  async function add(e) {
    e.preventDefault(); if (!f.title) return
    await supabase.from('tasks').insert({ title: f.title, due: f.due || null, assignee: f.assignee || me || null, deal_name: f.deal_name || null, done: false })
    setF({ title: '', due: '', assignee: '', deal_name: '' }); load()
  }
  async function toggle(t) { await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id); load() }
  async function del(id) { await supabase.from('tasks').delete().eq('id', id); load() }

  const today = new Date().toISOString().slice(0, 10)
  const groups = [
    { t: 'Просроченные', f: x => !x.done && x.due && x.due < today, cls: 'bad' },
    { t: 'Сегодня', f: x => !x.done && x.due === today },
    { t: 'Предстоящие', f: x => !x.done && (!x.due || x.due > today) },
    { t: 'Выполненные', f: x => x.done },
  ]
  function line(t) {
    const overdue = !t.done && t.due && t.due < today
    return (
      <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
        <input type="checkbox" checked={!!t.done} onChange={() => toggle(t)} style={{ marginTop: 3, width: 17, height: 17 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--faint)' : 'var(--fg)' }}>{t.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {t.due && <span className={overdue ? 'chip bad' : ''}>{(overdue ? 'Просрочена · ' : '') + fdate(t.due)}</span>}
            {t.assignee && <span>· {t.assignee}</span>}
            {t.deal_name && <span>· {t.deal_name}</span>}
          </div>
        </div>
        <button className="btn sm" onClick={() => del(t.id)}>✕</button>
      </div>
    )
  }
  return (
    <div>
      <h1 className="page-h">Задачи</h1>
      <div className="page-sub">Напоминания и дела</div>
      <form className="toolbar" onSubmit={add}>
        <input className="input search" placeholder="Что сделать" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <input className="input" style={{ width: 'auto' }} type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} />
        <input className="input" style={{ width: 'auto', flex: '0 1 150px' }} placeholder="Ответственный" value={f.assignee} onChange={e => setF({ ...f, assignee: e.target.value })} />
        <button className="btn primary">Добавить</button>
      </form>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : rows.length === 0 ? <div className="empty">Задач нет.</div>
          : groups.map(g => {
            const list = rows.filter(g.f)
            if (!list.length) return null
            return <div key={g.t} className="panel" style={{ marginBottom: 14 }}>
              <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 14 }}>{g.t}</h3><span className={'chip ' + (g.cls || '')} style={{ marginLeft: 'auto' }}>{list.length}</span>
              </div>
              <div style={{ padding: '0 16px 6px' }}>{list.map(line)}</div>
            </div>
          })}
    </div>
  )
}
