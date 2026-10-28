'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fdate } from '@/lib/format'
import { FormModal } from '@/components/CrudView'

const CFG = {
  title: 'Группа', table: 'groups',
  fields: [
    { key: 'course_name', label: 'Курс', required: true, full: true },
    { key: 'start_date', label: 'Начало', type: 'date' },
    { key: 'end_date', label: 'Окончание', type: 'date' },
    { key: 'time_text', label: 'Время занятий' },
    { key: 'format', label: 'Формат', type: 'select', options: ['Очно', 'Онлайн', 'Гибрид'] },
    { key: 'teacher_name', label: 'Преподаватель' },
    { key: 'room', label: 'Аудитория / ссылка' },
    { key: 'capacity', label: 'Мест', type: 'number' },
    { key: 'enrolled', label: 'Записано', type: 'number' },
  ],
  columns: [{ key: 'course_name' }],
}

export default function Schedule() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(null)
  async function load() {
    const { data } = await supabase.from('groups').select('*').order('start_date', { ascending: true })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])
  async function save(v) {
    const p = {}; CFG.fields.forEach(f => { let x = v[f.key]; if (f.type === 'number') x = x === '' || x == null ? null : Number(x); if (x === '') x = null; p[f.key] = x })
    if (edit && edit.id) await supabase.from('groups').update(p).eq('id', edit.id); else await supabase.from('groups').insert(p)
    setEdit(null); load()
  }
  const byMonth = {}
  rows.forEach(g => { const k = g.start_date ? g.start_date.slice(0, 7) : 'Без даты'; (byMonth[k] = byMonth[k] || []).push(g) })
  return (
    <div>
      <h1 className="page-h">Расписание</h1>
      <div className="page-sub">Учебные группы</div>
      <div className="toolbar"><button className="btn primary" onClick={() => setEdit({})}>+ Группа</button></div>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : rows.length === 0 ? <div className="empty">Расписание пустое — создайте группу.</div>
          : Object.keys(byMonth).sort().map(k => (
            <div key={k}>
              <div className="month-h">{k === 'Без даты' ? 'Без даты' : new Date(k + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div>
              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                {byMonth[k].map(g => {
                  const cap = Number(g.capacity) || 0, enr = Number(g.enrolled) || 0, full = cap && enr >= cap
                  return <div key={g.id} className="panel" style={{ padding: 14, cursor: 'pointer' }} onClick={() => setEdit(g)}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{g.course_name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div>{fdate(g.start_date)}{g.end_date ? ' — ' + fdate(g.end_date) : ''}</div>
                      {g.time_text && <div>{g.time_text}</div>}
                      {g.teacher_name && <div>Преп.: {g.teacher_name}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 9 }}>
                      {g.format && <span className="chip">{g.format}</span>}
                      {cap ? <span className={'chip ' + (full ? 'bad' : 'good')}>{enr} / {cap} мест</span> : null}
                      {g.room && <span className="chip">{g.room}</span>}
                    </div>
                  </div>
                })}
              </div>
            </div>
          ))}
      {edit && <FormModal cfg={CFG} values={edit} onSave={save} onClose={() => setEdit(null)} title="Группа" />}
    </div>
  )
}
