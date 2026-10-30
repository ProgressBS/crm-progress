'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGES, money } from '@/lib/constants'

function initials(s) {
  const t = (s || '?').trim()
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}
function ftime(ts) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
const isUrl = s => typeof s === 'string' && /^https?:\/\//.test(s)
const fmtNum = p => { const d = String(p || '').replace(/\D/g, ''); return d ? '+' + d : (p || '') }
// normalize any phone/chat id to the WhatsApp chat id form (digits, KZ 8->7)
const normId = s => { let d = String(s || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d }
const sameChat = (a, b) => { const x = normId(a), y = normId(b); return !!x && x === y }
const NUM_COLORS = ['#1f9d57', '#2f6fd0', '#c97a12', '#8b5cf6']

export default function Chats() {
  const supabase = createClient()
  const [msgs, setMsgs] = useState([])
  const [tasks, setTasks] = useState([])
  const [deals, setDeals] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [channels, setChannels] = useState([])
  const [me, setMe] = useState('')
  const [sel, setSel] = useState(null)
  const [numFilter, setNumFilter] = useState('all')
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [newTask, setNewTask] = useState('')
  const [cNum, setCNum] = useState(''); const [cAmt, setCAmt] = useState('')
  const [pAmt, setPAmt] = useState('')
  const [attachId, setAttachId] = useState('')
  const fileRef = useRef(null)
  const threadRef = useRef(null)

  async function load() {
    const [m, t, d, c, p] = await Promise.all([
      supabase.from('messages').select('*').order('ts', { ascending: true }).limit(1500),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('contracts').select('*').order('issue_date', { ascending: false }).limit(500),
      supabase.from('payments').select('*').order('pay_date', { ascending: false }).limit(500),
    ])
    setMsgs(m.data || []); setTasks(t.data || []); setDeals(d.data || [])
    setContracts(c.data || []); setPayments(p.data || [])
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || 'Сотрудник'))
    fetch('/api/wazzup/channels').then(r => r.json()).then(j => setChannels(j.channels || [])).catch(() => {})
    try {
      const want = new URLSearchParams(window.location.search).get('chat')
      if (want) setSel(normId(want))
    } catch (e) {}
    const i = setInterval(load, 12000)
    return () => clearInterval(i)
  }, [])

  const chName = {}, chColor = {}
  channels.forEach((c, i) => { chName[c.channelId] = fmtNum(c.phone); chColor[c.channelId] = NUM_COLORS[i % NUM_COLORS.length] })

  // group messages into conversations by chat_id
  const convMap = {}
  for (const m of msgs) {
    const id = m.chat_id || 'unknown'
    if (!convMap[id]) convMap[id] = { chat_id: id, name: null, channel: null, items: [] }
    convMap[id].items.push(m)
    if (m.contact_name) convMap[id].name = m.contact_name
    if (m.channel) convMap[id].channel = m.channel
  }
  let convs = Object.values(convMap).map(c => {
    const last = c.items[c.items.length - 1]
    return { ...c, name: c.name || fmtNum(c.chat_id), last, lastTs: last?.ts }
  }).sort((a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0))
  if (numFilter !== 'all') convs = convs.filter(c => c.channel === numFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    convs = convs.filter(c => (c.name || '').toLowerCase().includes(q) || (c.chat_id || '').includes(q))
  }

  const cur = Object.values(convMap).map(c => {
    const last = c.items[c.items.length - 1]
    return { ...c, name: c.name || fmtNum(c.chat_id), last, lastTs: last?.ts }
  }).find(c => c.chat_id === sel || sameChat(c.chat_id, sel)) || null
  const curTasks = tasks.filter(t => sameChat(t.chat_id, sel))
  const deal = deals.find(d => sameChat(d.chat_id, sel)) || null
  const curContracts = contracts.filter(x => sameChat(x.chat_id, sel))
  const curPayments = payments.filter(x => sameChat(x.chat_id, sel))
  const freeDeals = deals.filter(d => !d.chat_id)

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [sel, msgs.length])

  async function send(e) {
    e && e.preventDefault()
    if (!reply.trim() || !cur) return
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/wazzup/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: cur.chat_id, channelId: cur.channel, text: reply }),
      })
      const j = await res.json()
      if (!j.ok) { setErr('Не удалось отправить: ' + (typeof j.error === 'string' ? j.error : JSON.stringify(j.error || j.status))); setSending(false); return }
      setReply(''); setTimeout(load, 700)
    } catch (e2) { setErr('Ошибка сети при отправке') }
    setSending(false)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file || !cur) return
    setSending(true); setErr('')
    try {
      const path = `${cur.chat_id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`
      const up = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
      if (up.error) { setErr('Не удалось загрузить файл: ' + up.error.message); setSending(false); return }
      const { data: pub } = supabase.storage.from('chat-files').getPublicUrl(path)
      const res = await fetch('/api/wazzup/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: cur.chat_id, channelId: cur.channel, contentUri: pub.publicUrl, fileName: file.name }),
      })
      const j = await res.json()
      if (!j.ok) { setErr('Файл загружен, но не отправился: ' + (typeof j.error === 'string' ? j.error : JSON.stringify(j.error || j.status))); setSending(false); return }
      setTimeout(load, 800)
    } catch (e2) { setErr('Ошибка при отправке файла') }
    setSending(false)
  }

  async function addTask(e) {
    e.preventDefault(); if (!newTask.trim() || !cur) return
    await supabase.from('tasks').insert({ title: newTask, chat_id: cur.chat_id, contact_name: cur.name, assignee: me, done: false })
    setNewTask(''); load()
  }
  async function toggleTask(t) { await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id); load() }

  async function createDeal() {
    if (!cur) return
    await supabase.from('deals').insert({ client_name: cur.name, phone: cur.chat_id, chat_id: cur.chat_id, stage: 'call' })
    load()
  }
  async function attachDeal() {
    if (!attachId || !cur) return
    await supabase.from('deals').update({ chat_id: cur.chat_id }).eq('id', attachId)
    setAttachId(''); load()
  }
  async function moveStage(stage) { if (!deal) return; await supabase.from('deals').update({ stage }).eq('id', deal.id); load() }

  async function addContract(e) {
    e.preventDefault(); if (!cur) return
    await supabase.from('contracts').insert({ number: cNum || null, client: cur.name, amount: cAmt ? Number(cAmt) : null, chat_id: cur.chat_id, deal_name: deal?.client_name || cur.name, status: 'Подписан' })
    setCNum(''); setCAmt(''); load()
  }
  async function addPayment(expected) {
    if (!cur || !pAmt) return
    await supabase.from('payments').insert({ pay_date: new Date().toISOString().slice(0, 10), amount: Number(pAmt), client: cur.name, chat_id: cur.chat_id, deal_name: deal?.client_name || cur.name, method: expected ? null : 'Перечисление', status: expected ? 'Ожидается' : 'Оплачено' })
    setPAmt(''); load()
  }

  const numSegs = [['all', 'Все номера']].concat(channels.map(c => [c.channelId, fmtNum(c.phone)]))

  return (
    <div>
      <h1 className="page-h">Заявки и чаты</h1>
      <div className="page-sub">Переписка WhatsApp по каждому клиенту · сделка, договоры, оплаты и задачи — в одном месте</div>
      <div className={'chat-wrap' + (sel ? ' sel' : '')}>
        {/* left: conversation list */}
        <div className="chat-list">
          <div className="chat-list-head">Чаты <span className="chip">{convs.length}</span></div>
          {channels.length > 1 && <div className="chat-filter">
            {numSegs.map(([v, l]) => (
              <div key={v} className={'seg' + (numFilter === v ? ' on' : '')} onClick={() => setNumFilter(v)}>
                {v !== 'all' && <span className="num-dot" style={{ background: chColor[v] }} />}{l}
              </div>
            ))}
          </div>}
          <div className="chat-search"><input className="input" placeholder="Поиск по имени/номеру" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="chat-items">
            {convs.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Чатов пока нет. Они появятся, когда клиент напишет в WhatsApp.</div>}
            {convs.map(c => (
              <div key={c.chat_id} className={'chat-item' + (c.chat_id === sel ? ' active' : '')} onClick={() => setSel(c.chat_id)}>
                <div className="chat-av" style={{ background: chColor[c.channel] || 'var(--navy)' }}>{initials(c.name)}</div>
                <div className="ci-main">
                  <div className="ci-name">{c.name}{chName[c.channel] && <span className="ci-badge">{chName[c.channel]}</span>}</div>
                  <div className="ci-last">{c.last?.direction === 'out' ? '→ ' : ''}{isUrl(c.last?.text) ? '📎 документ' : c.last?.text}</div>
                </div>
                <div className="ci-time">{ftime(c.lastTs)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* center: conversation */}
        <div className="chat-main">
          {!cur ? <div className="chat-empty">Выберите чат слева, чтобы открыть переписку</div> : <>
            <div className="chat-head">
              <div>
                <span className="ch-name">{cur.name}</span>
                <div className="ch-sub">{fmtNum(cur.chat_id)}{chName[cur.channel] ? ' · номер ' + chName[cur.channel] : ''}</div>
              </div>
            </div>
            <div className="chat-thread" ref={threadRef}>
              {cur.items.map(m => (
                <div key={m.id} className={'bubble ' + (m.direction === 'out' ? 'out' : 'in')}>
                  {isUrl(m.text) ? <a href={m.text} target="_blank" rel="noreferrer">📎 Документ</a> : m.text}
                  <div className="bt">{ftime(m.ts)}{m.direction === 'out' && m.author ? ' · ' + m.author : ''}</div>
                </div>
              ))}
            </div>
            {err && <div style={{ color: 'var(--bad)', fontSize: 13, padding: '6px 12px' }}>{err}</div>}
            <form className="chat-reply" onSubmit={send}>
              <button type="button" className="icon-btn" title="Прикрепить документ" onClick={() => fileRef.current?.click()}>📎</button>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />
              <input className="input" placeholder="Сообщение…" value={reply} onChange={e => setReply(e.target.value)} />
              <button className="btn primary" disabled={sending}>{sending ? '…' : 'Отправить'}</button>
            </form>
          </>}
        </div>

        {/* right: client card */}
        {cur && <div className="chat-side">
          <div className="chat-side-head">Карточка клиента</div>
          <div className="chat-side-scroll">
            {/* deal */}
            <div className="side-sec">
              <h4>Сделка</h4>
              {deal ? <>
                <div className="mini-row"><span>Стадия</span><span className="deal-stage">{(STAGES.find(s => s.id === deal.stage) || STAGES[0]).name}</span></div>
                <select className="input" style={{ marginTop: 6, fontSize: 12.5, padding: '6px 8px' }} value={deal.stage || 'call'} onChange={e => moveStage(e.target.value)}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </> : <>
                <button className="btn primary sm" style={{ width: '100%', justifyContent: 'center' }} onClick={createDeal}>+ Создать сделку</button>
                {freeDeals.length > 0 && <div className="mini-add">
                  <select className="input" value={attachId} onChange={e => setAttachId(e.target.value)}>
                    <option value="">привязать к существующей…</option>
                    {freeDeals.map(d => <option key={d.id} value={d.id}>{d.client_name}</option>)}
                  </select>
                  <button className="btn sm" onClick={attachDeal}>OK</button>
                </div>}
              </>}
            </div>
            {/* contracts */}
            <div className="side-sec">
              <h4>Договоры</h4>
              {curContracts.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>Нет договоров</div>}
              {curContracts.map(c => <div key={c.id} className="mini-row"><span>№ {c.number || '—'}</span><span>{c.amount ? money(c.amount) : ''}</span></div>)}
              <form className="mini-add" onSubmit={addContract}>
                <input className="input" style={{ flex: '0 1 70px' }} placeholder="№" value={cNum} onChange={e => setCNum(e.target.value)} />
                <input className="input" placeholder="сумма" value={cAmt} onChange={e => setCAmt(e.target.value)} />
                <button className="btn sm">+</button>
              </form>
            </div>
            {/* payments */}
            <div className="side-sec">
              <h4>Оплаты</h4>
              {(() => {
                const paid = curPayments.filter(p => (p.status || 'Оплачено') !== 'Ожидается' && (p.status || 'Оплачено') !== 'Просрочено').reduce((s, p) => s + (Number(p.amount) || 0), 0)
                const due = Number(deal?.amount) || 0
                const exp = Math.max(0, due - paid)
                if (!due && curPayments.length === 0) return null
                return <div className="mini-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>К оплате</span><b>{money(due)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--good)' }}><span>Оплачено</span><b>{money(paid)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: exp > 0 ? '#c97a12' : 'var(--good)' }}><span>Ожидается</span><b>{money(exp)}</b></div>
                </div>
              })()}
              {curPayments.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>Нет оплат</div>}
              {curPayments.map(p => <div key={p.id} className="mini-row"><span>{p.pay_date} · {p.status || 'Оплачено'}</span><span>{money(p.amount)}</span></div>)}
              <input className="input" placeholder="сумма" value={pAmt} onChange={e => setPAmt(e.target.value)} />
              <div className="mini-add" style={{ marginTop: 4 }}>
                <button className="btn sm" type="button" onClick={() => addPayment(true)}>+ К оплате</button>
                <button className="btn primary sm" type="button" onClick={() => addPayment(false)}>+ Оплачено</button>
              </div>
            </div>
            {/* tasks */}
            <div className="side-sec">
              <h4>Задачи</h4>
              {curTasks.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>Задач нет</div>}
              {curTasks.map(t => (
                <div key={t.id} className={'task-row' + (t.done ? ' done' : '')} style={{ marginBottom: 6 }}>
                  <input type="checkbox" checked={!!t.done} onChange={() => toggleTask(t)} />
                  <div className="tt">{t.title}<div className="td">{t.done ? 'Сделано' : 'В работе'}{t.assignee ? ' · ' + t.assignee : ''}</div></div>
                </div>
              ))}
              <form className="mini-add" onSubmit={addTask}>
                <input className="input" placeholder="новая задача…" value={newTask} onChange={e => setNewTask(e.target.value)} />
                <button className="btn primary sm">+</button>
              </form>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
