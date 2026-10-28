'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
      }
      router.push('/'); router.refresh()
    } catch (e2) { setErr(e2.message || 'Ошибка входа') } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={submit} className="panel" style={{ width: 'min(400px,100%)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--navy)', color: 'var(--lime)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>П</div>
          <div><b style={{ fontSize: 16 }}>CRM Progress</b><div style={{ fontSize: 12, color: 'var(--faint)' }}>PROGRESS BUSINESS SCHOOL</div></div>
        </div>
        <h1 style={{ fontSize: 18, marginBottom: 14 }}>{mode === 'in' ? 'Вход для сотрудников' : 'Регистрация'}</h1>
        {mode === 'up' && <input className="input" style={{ marginBottom: 10 }} placeholder="Имя и фамилия" value={name} onChange={e => setName(e.target.value)} />}
        <input className="input" style={{ marginBottom: 10 }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" style={{ marginBottom: 14 }} type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
        {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? '…' : mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--muted)' }}>
          {mode === 'in'
            ? <>Нет аккаунта? <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setMode('up')}>Зарегистрироваться</a></>
            : <>Уже есть аккаунт? <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setMode('in')}>Войти</a></>}
        </div>
      </form>
    </div>
  )
}
