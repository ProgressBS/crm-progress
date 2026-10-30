'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function Chats() {
  const supabase = createClient()
  const [msgs, setMsgs] = useState([])
  const [tasks, setTasks] = useState([])
  const [me, setMe] = useState('')
  const [sel, setSel] = useState(null)
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [newTask, setNewTask] = useState('')
  const fileRef = useRef(null)
  const threadRef = useRef(null)

  async function load() {
    const [m, t] = await Promise.all([
      supabase.from('messages').select('*').order('ts', { ascending: true }).limit(1000),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    setMsgs(m.data || [])
    setTasks(t.data || [])
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || 'Сотрудник'))
    const i = setInterval(load, 12000)
    return () => clearInterval(i)
  }, [])

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
    return { ...c, name: c.name || c.chat_id, last, lastTs: last?.ts }
  }).sort((a, b) => new Date(b.lastTs || 0) - new Date(a.lastTs || 0))
  if (search.trim()) {
    const q = search.toLowerCase()
    convs = convs.filter(c => (c.name || '').toLowerCase().includes(q) || (c.chat_id || '').includes(q))
  }

  const cur = convs.find(c => c.chat_id === sel) || null
  const curTasks = tasks.filter(t => t.chat_id === sel)

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
    e.preventDefault()
    if (!newTask.trim() || !cur) return
    await supabase.from('tasks').insert({ title: newTask, chat_id: cur.chat_id, contact_name: cur.name, assignee: me, done: false })
    setNewTask(''); load()
  }
  async function toggleTask(t) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
    load()
  }

  return (
    <div>
      <h1 className="page-h">Заявки и чаты</h1>
      <div className="page-sub">Переписка WhatsApp по каждому клиенту · задачи и документы в чате</div>
      <div className={'chat-wrap' + (sel ? ' sel' : '')}>
        {/* left: conversation list */}
        <div className="chat-list">
          <div className="chat-list-head">Чаты <span className="chip">{convs.length}</span></div>
          <div className="chat-search"><input className="input" placeholder="Поиск по имени/номеру" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="chat-items">
            {convs.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Чатов пока нет. Они появятся, когда клиент напишет в WhatsApp.</div>}
            {convs.map(c => (
              <div key={c.chat_id} className={'chat-item' + (c.chat_id === sel ? ' active' : '')} onClick={() => setSel(c.chat_id)}>
                <div className="chat-av">{initials(c.name)}</div>
                <div className="ci-main">
                  <div className="ci-name">{c.name}</div>
                  <div className="ci-last">{c.last?.direction === 'out' ? '→ ' : ''}{c.last?.text}</div>
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
                <button className="btn sm" style={{ marginRight: 8, display: 'none' }} onClick={() => setSel(null)}>‹</button>
                <span className="ch-name">{cur.name}</span>
                <div className="ch-sub">{cur.chat_id}</div>
              </div>
            </div>
            <div className="chat-thread" ref={threadRef}>
              {cur.items.map(m => (
                <div key={m.id} className={'bubble ' + (m.direction === 'out' ? 'out' : 'in')}>
                  {isUrl(m.text)
                    ? <a href={m.text} target="_blank" rel="noreferrer">📎 Документ</a>
                    : m.text}
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

        {/* right: tasks for this chat */}
        {cur && <div className="chat-side">
          <div className="chat-side-head">Задачи по клиенту</div>
          <div className="chat-tasks">
            {curTasks.length === 0 && <div style={{ color: 'var(--faint)', fontSize: 12.5, padding: 6 }}>Задач нет. Поставьте первую ниже.</div>}
            {curTasks.map(t => (
              <div key={t.id} className={'task-row' + (t.done ? ' done' : '')}>
                <input type="checkbox" checked={!!t.done} onChange={() => toggleTask(t)} />
                <div className="tt">{t.title}<div className="td">{t.done ? 'Сделано' : 'В работе'}{t.assignee ? ' · ' + t.assignee : ''}</div></div>
              </div>
            ))}
          </div>
          <form onSubmit={addTask} style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Новая задача…" value={newTask} onChange={e => setNewTask(e.target.value)} />
            <button className="btn primary sm">+</button>
          </form>
        </div>}
      </div>
    </div>
  )
}
