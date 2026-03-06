'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Login failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      const user = d.data.member
      if (!user.isAdmin && !user.emailVerified) return setError('Please verify your email before logging in')
      if (!user.isAdmin && user.kycStatus !== 'APPROVED') { router.push('/kyc'); return }
      router.push('/dashboard')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  async function handleRegister(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Registration failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      setSuccess('Account created! Please check your email to verify your account.')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  async function handleForgot(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      setSuccess('If that email exists, a reset link has been sent.')
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#c9a84c,#a07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0c0f', fontSize: 22, fontWeight: 800, margin: '0 auto 12px' }}>C</div>
          <div style={{ fontWeight: 800, fontSize: 22 }}>Nova-Lite Club10 Pool</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Investment Pool Manager</div>
        </div>

        {tab !== 'forgot' && (
          <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }} style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--muted)',
                fontWeight: tab === t ? 600 : 400, fontSize: 13,
              }}>{t === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--accent)', fontSize: 13 }}>{success}</div>}

        {tab === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
            <div><label style={labelStyle}>Password</label><input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin(e)} /></div>
            <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button onClick={() => { setTab('forgot'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>
        )}

        {tab === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Full Name</label><input type="text" style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Jane Doe" /></div>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
            <div><label style={labelStyle}>Phone (optional)</label><input type="text" style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" /></div>
            <div><label style={labelStyle}>Password</label><input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" /></div>
            <button onClick={handleRegister} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        )}

        {tab === 'forgot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
              <div style={{ fontWeight: 600 }}>Forgot Password</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Enter your email to receive a reset link</div>
            </div>
            <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
            <button onClick={handleForgot} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button onClick={() => { setTab('login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Back to Sign In
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Nova-Lite Club10 Pool · Secure Investment Platform
        </div>
      </div>
    </div>
  )
}
