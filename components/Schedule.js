'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fdate } from '@/lib/format'

const FIELDS = [
  { key: 'course_name', label: 'Курс', full: true },
  { key: 'start_date', label: 'Начало', type: 'date' },
  { key: 'end_date', label: 'Окончание', type: 'date' },
  { key: 'time_text', label: 'Время занятий' },
  { key: 'format', label: 'Формат', type: 'select', options: ['Очно', 'Онлайн', 'Гибрид'] },
  { key: 'teacher_name', label: 'Преподаватель' },
  { key: 'room', label: 'Аудитория / ссылка' },
  { key: 'capacity', label: 'Мест', type: 'number' },
]
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const iso = (d) => d.toISOString().slice(0, 10)
const digits = s => String(s || '').replace(/\D/g, '')
function fmtColor(f) { return f === 'Онлайн' ? '--s6' : f === 'Очно' ? '--s3' : '--s1' }

function GroupModal({ group, onClose, onChanged }) {
  const supabase = createClient()
  const [v, setV] = useState(group || {})
  const [members, setMembers] = useState([])
  const [nm, setNm] = useState(''); const [ph, setPh] = useState('')
  const id = v.id

  async function loadMembers() {
    if (!id) return
    const { data } = await supabase.from('group_members').select('*').eq('group_id', id).order('created_at', { ascending: true })
    setMembers(data || [])
  }
  useEffect(() => { loadMembers() }, [id])

  async function save() {
    const p = {}; FIELDS.forEach(f => { let x = v[f.key]; if (f.type === 'number') x = x === '' || x == null ? null : Number(x); if (x === '') x = null; p[f.key] = x })
    if (id) { await supabase.from('groups').update(p).eq('id', id) }
    else { const { data } = await supabase.from('groups').insert(p).select().single(); if (data) setV(data) }
    onChanged && onChanged()
  }
  async function addMember(e) {
    e.preventDefault(); if (!nm.trim() || !id) return
    const chat = digits(ph)
    await supabase.from('group_members').insert({ group_id: id, name: nm, phone: ph || null, chat_id: chat || null })
    setNm(''); setPh(''); loadMembers()
    await supabase.from('groups').update({ enrolled: members.length + 1 }).eq('id', id); onChanged && onChanged()
  }
  async function delMember(m) {
    await supabase.from('group_members').delete().eq('id', m.id); loadMembers()
    await supabase.from('groups').update({ enrolled: Math.max(0, members.length - 1) }).eq('id', id); onChanged && onChanged()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-h"><b>{id ? 'Группа' : 'Новая группа'}</b><button className="x" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <div className="form-grid">
            {FIELDS.map(f => (
              <div key={f.key} className={'fld' + (f.full ? ' full' : '')}>
                <label>{f.label}</label>
                {f.type === 'select'
                  ? <select className="input" value={v[f.key] || ''} onChange={e => setV({ ...v, [f.key]: e.target.value })}>
                      <option value="">—</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input className="input" type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                      value={v[f.key] || ''} onChange={e => setV({ ...v, [f.key]: e.target.value })} />}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>Участники {members.length ? `(${members.length})` : ''}</h4>
            {!id && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>Сначала сохраните группу — потом добавите участников.</div>}
            {id && <>
              {members.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)', marginBottom: 6 }}>Участников пока нет.</div>}
              {members.map(m => (
                <div key={m.id} className="mini-row" style={{ alignItems: 'center' }}>
                  <span style={{ flex: 1 }}><b>{m.name}</b>{m.phone ? ' · ' + m.phone : ''}</span>
                  {m.chat_id && <a className="btn sm" href={'/feed?chat=' + encodeURIComponent(m.chat_id)}>Чат</a>}
                  <button className="btn sm" onClick={() => delMember(m)}>✕</button>
                </div>
              ))}
              <form className="mini-add" onSubmit={addMember} style={{ marginTop: 8 }}>
                <input className="input" placeholder="ФИО участника" value={nm} onChange={e => setNm(e.target.value)} />
                <input className="input" style={{ flex: '0 1 150px' }} placeholder="номер WhatsApp" value={ph} onChange={e => setPh(e.target.value)} />
                <button className="btn primary sm">+</button>
              </form>
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 5 }}>Номер привязывает участника к его переписке — кнопка «Чат» откроет диалог.</div>
            </>}
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Закрыть</button>
          <button className="btn primary" onClick={save}>Сохранить</button>
        </div>
      </div>
    </div>
  )
}

export default function Schedule() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState(null)
  const [view, setView] = useState('calendar')
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })

  async function load() {
    const { data } = await supabase.from('groups').select('*').order('start_date', { ascending: true })
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])
  function shift(delta) { setCursor(c => { let m = c.m + delta, y = c.y; if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ } return { y, m } }) }

  const dayMap = {}
  rows.forEach(g => {
    if (!g.start_date) return
    const s = new Date(g.start_date + 'T00:00:00')
    const e = g.end_date ? new Date(g.end_date + 'T00:00:00') : s
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) { const k = iso(d); (dayMap[k] = dayMap[k] || []).push(g) }
  })

  function calendar() {
    const first = new Date(cursor.y, cursor.m, 1)
    const startDow = (first.getDay() + 6) % 7
    const gridStart = new Date(cursor.y, cursor.m, 1 - startDow)
    const todayK = iso(new Date())
    const cells = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i)
      const k = iso(d), inMonth = d.getMonth() === cursor.m
      const evs = dayMap[k] || []
      cells.push(
        <div key={k} className={'cal-day' + (inMonth ? '' : ' other') + (k === todayK ? ' today' : '')}>
          <div className="cal-num">{d.getDate()}</div>
          {evs.slice(0, 4).map((g, j) => (
            <div key={g.id + '_' + j} className="cal-ev" style={{ background: `var(${fmtColor(g.format)})` }}
              title={g.course_name + (g.time_text ? ' · ' + g.time_text : '')} onClick={() => setEdit(g)}>{g.course_name}</div>
          ))}
          {evs.length > 4 && <div className="cal-more">+{evs.length - 4}</div>}
        </div>
      )
    }
    return <div className="cal-grid">{WD.map(w => <div key={w} className="cal-wd">{w}</div>)}{cells}</div>
  }

  function list() {
    const byMonth = {}
    rows.forEach(g => { const k = g.start_date ? g.start_date.slice(0, 7) : 'Без даты'; (byMonth[k] = byMonth[k] || []).push(g) })
    return Object.keys(byMonth).sort().map(k => (
      <div key={k}>
        <div className="month-h">{k === 'Без даты' ? 'Без даты' : new Date(k + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
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
                {cap ? <span className={'chip ' + (full ? 'bad' : 'good')}>{enr} / {cap} мест</span> : (enr ? <span className="chip">{enr} участ.</span> : null)}
                {g.room && <span className="chip">{g.room}</span>}
              </div>
            </div>
          })}
        </div>
      </div>
    ))
  }

  return (
    <div>
      <h1 className="page-h">Расписание</h1>
      <div className="page-sub">Учебные группы · участники с привязкой к переписке</div>
      <div className="cal-head">
        {view === 'calendar' && <div className="cal-nav">
          <button className="btn sm" onClick={() => shift(-1)}>‹</button>
          <b style={{ minWidth: 150, textAlign: 'center' }}>{MONTHS[cursor.m]} {cursor.y}</b>
          <button className="btn sm" onClick={() => shift(1)}>›</button>
          <button className="btn sm" onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }) }}>Сегодня</button>
        </div>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="seg">
            <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>Календарь</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Список</button>
          </div>
          <button className="btn primary" onClick={() => setEdit({})}>+ Группа</button>
        </div>
      </div>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : view === 'calendar' ? calendar()
          : rows.length === 0 ? <div className="empty">Расписание пустое — создайте группу.</div> : list()}
      {edit && <GroupModal group={edit} onClose={() => { setEdit(null); load() }} onChanged={load} />}
    </div>
  )
}
