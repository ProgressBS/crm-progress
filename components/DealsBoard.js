'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STAGE_IDX } from '@/lib/constants'
import { money, num, fdate } from '@/lib/format'

const SOURCES = ['Звонок', 'WhatsApp', 'Сайт', 'Рекомендация', 'Тендер', 'Рассылка', 'Instagram', 'Другое']
const ENT = ['ТОО «ПРОГРЕСС&CO»', 'ИП PROGRESS BUSINESS SCHOOL']
const today = () => new Date().toISOString().slice(0, 10)
const digits = s => { let d = String(s || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d }

export default function DealsBoard() {
  const supabase = createClient()
  const [deals, setDeals] = useState([])
  const [acts, setActs] = useState([])
  const [tasks, setTasks] = useState([])
  const [docs, setDocs] = useState({ kps: [], contracts: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState('')
  const [sel, setSel] = useState(null) // selected deal id
  const [adding, setAdding] = useState(false)

  async function load() {
    const [d, a, t, k, c, p] = await Promise.all([
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
      supabase.from('activities').select('*').order('at', { ascending: false }),
      supabase.from('tasks').select('*'),
      supabase.from('kps').select('*'), supabase.from('contracts').select('*'), supabase.from('payments').select('*'),
    ])
    setDeals(d.data || []); setActs(a.data || []); setTasks(t.data || [])
    setDocs({ kps: k.data || [], contracts: c.data || [], payments: p.data || [] })
    setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || 'Сотрудник'))
  }, [])

  async function move(d, stage) {
    const patch = { stage, stage_at: new Date().toISOString() }
    if (stage === 'paid' && !d.paid_at) patch.paid_at = new Date().toISOString()
    await supabase.from('deals').update(patch).eq('id', d.id); load()
  }
  async function archive(d) { await supabase.from('deals').update({ archived: true }).eq('id', d.id); setSel(null); load() }
  async function del(d) { await supabase.from('deals').delete().eq('id', d.id); setSel(null); load() }

  const active = deals.filter(d => !d.archived)
  const deal = sel ? deals.find(x => x.id === sel) : null

  return (
    <div>
      <h1 className="page-h">Сделки</h1>
      <div className="page-sub">Воронка продаж — 8 стадий</div>
      <div className="toolbar"><button className="btn primary" onClick={() => setAdding(true)}>+ Сделка</button>
        <span className="note-box" style={{ margin: 0, flex: 1 }}>Нажмите карточку, чтобы открыть сделку: сменить стадию, добавить звонок, задачу, КП, договор или оплату.</span></div>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : active.length === 0 ? <div className="empty">Сделок пока нет — создайте первую.</div>
          : <div className="board">
            {STAGES.map(s => {
              const inCol = active.filter(d => d.stage === s.id)
              return <div key={s.id} className="col">
                <h3><span>{s.name}</span><span style={{ color: 'var(--muted)' }}>{inCol.length}</span></h3>
                {inCol.map(d => (
                  <div key={d.id} className="card" style={{ borderLeftColor: `var(${s.v})` }} onClick={() => setSel(d.id)}>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>{d.client_name}</div>
                    {d.course_name && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{d.course_name}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <b style={{ fontSize: 13 }}>{d.amount ? money(d.amount) : '—'}</b>
                      {d.listeners ? <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{num(d.listeners)} чел.</span> : null}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                      {d.entity && <span className="chip">{d.entity.indexOf('ТОО') >= 0 ? 'ТОО' : 'ИП'}</span>}
                      {d.source && <span className="chip">{d.source}</span>}
                      {d.responsible && <span className="chip accent">{d.responsible}</span>}
                    </div>
                  </div>
                ))}
              </div>
            })}
          </div>}
      {adding && <DealForm me={me} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />}
      {deal && <DealDetail deal={deal} me={me} acts={acts} tasks={tasks} docs={docs}
        onClose={() => setSel(null)} reload={load} move={move} archive={archive} del={del} />}
    </div>
  )
}

function DealForm({ me, onClose, onSaved, deal }) {
  const supabase = createClient()
  const [v, setV] = useState(deal || { responsible: me })
  const [courses, setCourses] = useState([])
  const set = (k, x) => setV(p => ({ ...p, [k]: x }))
  useEffect(() => { supabase.from('courses').select('name').order('name').then(({ data }) => setCourses((data || []).map(c => c.name).filter(Boolean))) }, [])
  async function submit(e) {
    e.preventDefault(); if (!v.client_name) return
    const phone = v.phone ? String(v.phone).trim() : null
    const payload = {
      client_name: v.client_name, course_name: v.course_name || null,
      listeners: v.listeners ? Number(v.listeners) : null, amount: v.amount ? Number(v.amount) : null,
      source: v.source || null, entity: v.entity || null, responsible: v.responsible || null, comment: v.comment || null,
      phone, chat_id: phone ? digits(phone) : (v.chat_id || null),
    }
    if (deal && deal.id) await supabase.from('deals').update(payload).eq('id', deal.id)
    else await supabase.from('deals').insert({ ...payload, stage: 'call' })
    onSaved()
  }
  return (
    <div className="overlay" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <div className="mh"><h3>{deal ? 'Сделка' : 'Новая сделка'}</h3><button type="button" className="x" onClick={onClose}>×</button></div>
        <div className="mb"><div className="form-grid">
          <div className="field full"><label>Клиент *</label><input value={v.client_name || ''} onChange={e => set('client_name', e.target.value)} /></div>
          <div className="field full"><label>Номер WhatsApp / телефон <span style={{ color: 'var(--faint)', fontWeight: 400 }}>— свяжет переписку, договор и оплату</span></label><input placeholder="+7 7__ ___ __ __" value={v.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
          <div className="field full"><label>Курс <span style={{ color: 'var(--faint)', fontWeight: 400 }}>— выберите из списка или впишите свой</span></label>
            <input list="deal-courses" placeholder="Начните вводить название курса…" value={v.course_name || ''} onChange={e => set('course_name', e.target.value)} />
            <datalist id="deal-courses">{courses.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="field"><label>Кол-во слушателей</label><input type="number" value={v.listeners || ''} onChange={e => set('listeners', e.target.value)} /></div>
          <div className="field"><label>Сумма (без НДС)</label><input type="number" value={v.amount || ''} onChange={e => set('amount', e.target.value)} /></div>
          <div className="field"><label>Источник</label><select value={v.source || ''} onChange={e => set('source', e.target.value)}><option value=""></option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>Организация</label><select value={v.entity || ''} onChange={e => set('entity', e.target.value)}><option value=""></option>{ENT.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="field full"><label>Ответственный</label><input value={v.responsible || ''} onChange={e => set('responsible', e.target.value)} /></div>
          <div className="field full"><label>Комментарий</label><textarea value={v.comment || ''} onChange={e => set('comment', e.target.value)} /></div>
        </div></div>
        <div className="mf"><button type="button" className="btn" onClick={onClose}>Отмена</button><button className="btn primary">Сохранить</button></div>
      </form>
    </div>
  )
}

function DealDetail({ deal, me, acts, tasks, docs, onClose, reload, move, archive, del }) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const dActs = acts.filter(a => a.deal_id === deal.id)
  const dTasks = tasks.filter(t => t.deal_id === deal.id)
  const dKps = docs.kps.filter(x => x.deal_name === deal.client_name)
  const dCon = docs.contracts.filter(x => x.deal_name === deal.client_name)
  const dPay = docs.payments.filter(x => x.deal_name === deal.client_name)
  const paidSum = dPay.filter(p => (p.status || 'Оплачено') !== 'Ожидается' && (p.status || 'Оплачено') !== 'Просрочено').reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const dueTotal = Number(deal.amount) || 0
  const expectedSum = Math.max(0, dueTotal - paidSum)

  async function addActivity() {
    const text = window.prompt && prompt('Что обсудили / результат?'); if (!text) return
    await supabase.from('activities').insert({ deal_id: deal.id, client_name: deal.client_name, type: 'call', text, author: me, at: new Date().toISOString() }); reload()
  }
  async function addTask() {
    const title = prompt('Задача:'); if (!title) return
    await supabase.from('tasks').insert({ deal_id: deal.id, deal_name: deal.client_name, title, assignee: me, done: false }); reload()
  }
  async function addKp() {
    await supabase.from('kps').insert({ client: deal.client_name, course_name: deal.course_name, amount: deal.amount, entity: deal.entity, deal_name: deal.client_name, issue_date: today(), status: 'Отправлено' })
    if (STAGE_IDX[deal.stage] < STAGE_IDX['kp']) await supabase.from('deals').update({ stage: 'kp', stage_at: new Date().toISOString() }).eq('id', deal.id); reload()
  }
  async function addContract() {
    await supabase.from('contracts').insert({ client: deal.client_name, course_name: deal.course_name, amount: deal.amount, entity: deal.entity, deal_name: deal.client_name, chat_id: deal.chat_id || null, issue_date: today(), status: 'Подписан' })
    if (STAGE_IDX[deal.stage] < STAGE_IDX['contract']) await supabase.from('deals').update({ stage: 'contract', stage_at: new Date().toISOString() }).eq('id', deal.id); reload()
  }
  async function addPayment(expected) {
    const label = expected ? 'Сумма к оплате (ожидается):' : 'Сумма полученной оплаты:'
    const amount = prompt(label, deal.amount || ''); if (!amount) return
    await supabase.from('payments').insert({ client: deal.client_name, course_name: deal.course_name, amount: Number(amount), deal_name: deal.client_name, chat_id: deal.chat_id || null, pay_date: today(), method: expected ? null : 'Перечисление', status: expected ? 'Ожидается' : 'Оплачено' })
    if (!expected && STAGE_IDX[deal.stage] < STAGE_IDX['paid']) await supabase.from('deals').update({ stage: 'paid', stage_at: new Date().toISOString(), paid_at: new Date().toISOString() }).eq('id', deal.id); reload()
  }

  const docRows = []
  dKps.forEach(x => docRows.push(['КП ' + (x.number || ''), money(x.amount || 0) + (x.status ? ' · ' + x.status : '')]))
  dCon.forEach(x => docRows.push(['Договор ' + (x.number || ''), money(x.amount || 0) + (x.status ? ' · ' + x.status : '')]))
  dPay.forEach(x => docRows.push([(x.status === 'Ожидается' ? 'К оплате ' : 'Оплата ') + fdate(x.pay_date), money(x.amount || 0) + ' · ' + (x.status || 'Оплачено') + (x.method ? ' · ' + x.method : '')]))

  if (editing) return <DealForm me={me} deal={deal} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />

  return (
    <div className="overlay" onClick={e => { if (e.target.classList.contains('overlay')) onClose() }}>
      <div className="modal">
        <div className="mh"><h3>{deal.client_name}</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="mb">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="btn sm" onClick={() => setEditing(true)}>Редактировать</button>
            <button className="btn sm" onClick={addActivity}>+ Звонок</button>
            <button className="btn sm" onClick={addTask}>+ Задача</button>
            <button className="btn sm" onClick={addKp}>+ КП</button>
            <button className="btn sm" onClick={addContract}>+ Договор</button>
            <button className="btn sm" onClick={() => addPayment(true)}>+ К оплате</button>
            <button className="btn sm" onClick={() => addPayment(false)}>+ Оплата получена</button>
            {deal.chat_id && <a className="btn sm" style={{ background: 'var(--s1)', color: '#fff', borderColor: 'transparent' }} href={'/feed?chat=' + encodeURIComponent(deal.chat_id)}>💬 Переписка</a>}
            <button className="btn sm" style={{ marginLeft: 'auto', borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={() => archive(deal)}>В архив</button>
          </div>
          <div className="detail-sec"><h4>Стадия</h4>
            <div className="stageline">{STAGES.map(s => {
              const on = deal.stage === s.id, done = STAGE_IDX[deal.stage] > STAGE_IDX[s.id]
              return <button key={s.id} onClick={() => move(deal, s.id)} style={on || done ? { background: `var(${s.v})`, color: '#fff', borderColor: 'transparent', opacity: done ? .6 : 1 } : {}}>{s.name}</button>
            })}</div>
          </div>
          <div className="detail-sec"><h4>Данные</h4>
            <dl className="kv">
              <dt>Номер</dt><dd>{deal.phone || (deal.chat_id ? deal.chat_id : '—')}{deal.chat_id ? <> · <a href={'/feed?chat=' + encodeURIComponent(deal.chat_id)}>открыть чат</a></> : null}</dd>
              <dt>Курс</dt><dd>{deal.course_name || '—'}</dd>
              <dt>Слушателей</dt><dd>{deal.listeners || '—'}</dd>
              <dt>Сумма (к оплате)</dt><dd>{deal.amount ? money(deal.amount) : '—'}</dd>
              <dt>Оплачено</dt><dd style={{ color: 'var(--good)' }}>{money(paidSum)}</dd>
              <dt>Ожидается</dt><dd style={{ color: expectedSum > 0 ? 'var(--warn, #c97a12)' : 'var(--good)', fontWeight: 600 }}>{money(expectedSum)}{expectedSum > 0 ? ' — ждём оплату' : ' — закрыто'}</dd>
              <dt>Источник</dt><dd>{deal.source || '—'}</dd>
              <dt>Организация</dt><dd>{deal.entity || '—'}</dd>
              <dt>Ответственный</dt><dd>{deal.responsible || '—'}</dd>
              {deal.comment ? <><dt>Комментарий</dt><dd>{deal.comment}</dd></> : null}
            </dl>
          </div>
          {dTasks.length > 0 && <div className="detail-sec"><h4>Задачи</h4>{dTasks.map(t => <div key={t.id} style={{ fontSize: 13, padding: '4px 0', color: t.done ? 'var(--faint)' : 'var(--fg)' }}>{t.done ? '✓ ' : '• '}{t.title}{t.due ? ' · ' + fdate(t.due) : ''}</div>)}</div>}
          {docRows.length > 0 && <div className="detail-sec"><h4>Документы и оплаты</h4><dl className="kv">{docRows.map((r, i) => [<dt key={'t'+i}>{r[0]}</dt>, <dd key={'d'+i}>{r[1]}</dd>])}</dl></div>}
          <div className="detail-sec"><h4>Общение</h4>
            {dActs.length === 0 ? <div style={{ color: 'var(--faint)', fontSize: 12.5 }}>Пока нет записей.</div>
              : <div className="feed">{dActs.map(a => <div key={a.id} className="fitem"><div className="ic">{a.type === 'whatsapp' ? 'WA' : 'Зв'}</div><div className="bd"><div style={{ fontSize: 13 }}>{a.text}</div><div className="m"><span>{fdate(a.at)}</span>{a.author && <span>· {a.author}</span>}</div></div></div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
