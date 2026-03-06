'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Login failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      router.push('/dashboard')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  async function handleRegister(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Registration failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      router.push('/dashboard')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
    boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    fontSize: 11, color: 'var(--muted)', display: 'block',
    marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#c9a84c,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0c0f', fontSize: 22, fontWeight: 800, margin: '0 auto 12px' }}>C</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>Club10 Pool</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Investment Pool Manager</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }} style={{
              flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              fontWeight: tab === t ? 600 : 400, fontSize: 13,
              textTransform: 'capitalize',
            }}>{t === 'login' ? 'Sign In' : 'Register'}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        {tab === 'login' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
            <div><label style={labelStyle}>Password</label><input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin(e)} /></div>
            <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Full Name</label><input type="text" style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Jane Doe" /></div>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
            <div><label style={labelStyle}>Phone (optional)</label><input type="text" style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" /></div>
            <div><label style={labelStyle}>Password</label><input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" /></div>
            <button onClick={handleRegister} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Club10 Pool · Secure Investment Platform
        </div>
      </div>
    </div>
  )
}
```

**After making these changes, also run `prisma db push`** via the Vercel build command to add the `passwordHash` column to your investors table in Supabase. Temporarily set build command to:
```
prisma db push && prisma generate && next build
