'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fdate } from '@/lib/format'

const TYPES = [['call', 'Звонок'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['meeting', 'Встреча'], ['note', 'Заметка']]
const ICON = { call: 'Зв', whatsapp: 'WA', email: 'Em', meeting: 'Вс', note: 'За' }

export default function Feed() {
  const supabase = createClient()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState('')
  const [f, setF] = useState({ type: 'call', client_name: '', text: '' })
  const [chat, setChat] = useState(null) // {chat_id, channel, name}
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const [a, m] = await Promise.all([
      supabase.from('activities').select('*').order('at', { ascending: false }).limit(300),
      supabase.from('messages').select('*').order('ts', { ascending: false }).limit(300),
    ])
    const acts = (a.data || []).map(x => ({
      key: 'a' + x.id, kind: x.type, text: x.text, name: x.client_name,
      ts: x.at, author: x.author, wa: false,
    }))
    const msgs = (m.data || []).map(x => ({
      key: 'm' + x.id, kind: 'whatsapp', text: x.text, name: x.contact_name || x.chat_id,
      ts: x.ts, author: x.author, wa: true, direction: x.direction,
      chat_id: x.chat_id, channel: x.channel,
    }))
    const all = [...acts, ...msgs].sort((p, q) => new Date(q.ts) - new Date(p.ts))
    setRows(all); setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || 'Сотрудник'))
    const t = setInterval(load, 20000) // подтягивать новые сообщения
    return () => clearInterval(t)
  }, [])

  async function add(e) {
    e.preventDefault(); if (!f.text) return
    await supabase.from('activities').insert({ type: f.type, client_name: f.client_name || null, text: f.text, author: me, at: new Date().toISOString() })
    setF({ type: 'call', client_name: '', text: '' }); load()
  }

  async function send(e) {
    e.preventDefault(); if (!reply.trim() || !chat) return
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/wazzup/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.chat_id, channelId: chat.channel, text: reply, author: me }),
      })
      const j = await res.json()
      if (!j.ok) { setErr('Не удалось отправить: ' + (typeof j.error === 'string' ? j.error : JSON.stringify(j.error || j.status))); setSending(false); return }
      setReply(''); setTimeout(load, 800)
    } catch (e2) { setErr('Ошибка сети при отправке') }
    setSending(false)
  }

  return (
    <div>
      <h1 className="page-h">Заявки и чаты</h1>
      <div className="page-sub">Лента общения с клиентами · WhatsApp подтягивается автоматически</div>

      {chat && (
        <form className="toolbar" onSubmit={send} style={{ alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Ответ в WhatsApp · <b>{chat.name}</b></div>
          <input className="input search" placeholder="Ваш ответ…" value={reply} onChange={e => setReply(e.target.value)} autoFocus />
          <button className="btn primary" disabled={sending}>{sending ? '…' : 'Отправить'}</button>
          <button type="button" className="btn sm" onClick={() => { setChat(null); setReply(''); setErr('') }}>Закрыть</button>
        </form>
      )}
      {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 8 }}>{err}</div>}

      <form className="toolbar" onSubmit={add}>
        <select className="input" style={{ width: 'auto' }} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" style={{ width: 'auto', flex: '0 1 180px' }} placeholder="Клиент" value={f.client_name} onChange={e => setF({ ...f, client_name: e.target.value })} />
        <input className="input search" placeholder="Что обсудили / результат" value={f.text} onChange={e => setF({ ...f, text: e.target.value })} />
        <button className="btn primary">Добавить</button>
      </form>

      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : rows.length === 0 ? <div className="empty">Лента пуста. Записи добавляются вручную, а переписка WhatsApp появится здесь после подключения Wazzup.</div>
          : <div className="panel" style={{ padding: '4px 16px' }}><div className="feed">
            {rows.map(a => (
              <div key={a.key} className="fitem">
                <div className={'ic ' + (a.wa ? 'wa' : a.kind === 'call' ? 'call' : '')}>{a.wa ? 'WA' : (ICON[a.kind] || 'За')}</div>
                <div className="bd">
                  <div style={{ fontSize: 13.5 }}>
                    {a.wa && <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 6 }}>{a.direction === 'out' ? '→' : '←'}</span>}
                    {a.text}
                  </div>
                  <div className="m">
                    <span>{a.wa ? 'WhatsApp' : (TYPES.find(t => t[0] === a.kind) || [, a.kind])[1]}</span>
                    {a.name && <span>· {a.name}</span>}
                    <span>· {fdate(a.ts)}</span>
                    {a.author && <span>· {a.author}</span>}
                    {a.wa && a.chat_id && a.channel && (
                      <a style={{ color: 'var(--accent)', cursor: 'pointer', marginLeft: 6 }}
                        onClick={() => { setChat({ chat_id: a.chat_id, channel: a.channel, name: a.name }); setErr('') }}>Ответить</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div></div>}
    </div>
  )
}
