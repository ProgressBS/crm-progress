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

  async function load() {
    const { data } = await supabase.from('activities').select('*').order('at', { ascending: false }).limit(300)
    setRows(data || []); setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.user_metadata?.full_name || data?.user?.email || 'Сотрудник'))
  }, [])

  async function add(e) {
    e.preventDefault(); if (!f.text) return
    await supabase.from('activities').insert({ type: f.type, client_name: f.client_name || null, text: f.text, author: me, at: new Date().toISOString() })
    setF({ type: 'call', client_name: '', text: '' }); load()
  }

  return (
    <div>
      <h1 className="page-h">Заявки и чаты</h1>
      <div className="page-sub">Лента общения с клиентами</div>
      <div className="note-box">WhatsApp с двух номеров школы пойдёт сюда автоматически после подключения Wazzup («Другая CRM»). Сейчас записи добавляются вручную.</div>
      <form className="toolbar" onSubmit={add}>
        <select className="input" style={{ width: 'auto' }} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" style={{ width: 'auto', flex: '0 1 180px' }} placeholder="Клиент" value={f.client_name} onChange={e => setF({ ...f, client_name: e.target.value })} />
        <input className="input search" placeholder="Что обсудили / результат" value={f.text} onChange={e => setF({ ...f, text: e.target.value })} />
        <button className="btn primary">Добавить</button>
      </form>
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div>
        : rows.length === 0 ? <div className="empty">Лента пуста — добавьте первую запись.</div>
          : <div className="panel" style={{ padding: '4px 16px' }}><div className="feed">
            {rows.map(a => (
              <div key={a.id} className="fitem">
                <div className={'ic ' + (a.type === 'whatsapp' ? 'wa' : a.type === 'call' ? 'call' : '')}>{ICON[a.type] || 'За'}</div>
                <div className="bd">
                  <div style={{ fontSize: 13.5 }}>{a.text}</div>
                  <div className="m">
                    <span>{(TYPES.find(t => t[0] === a.type) || [, a.type])[1]}</span>
                    {a.client_name && <span>· {a.client_name}</span>}
                    <span>· {fdate(a.at)}</span>
                    {a.author && <span>· {a.author}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div></div>}
    </div>
  )
}
