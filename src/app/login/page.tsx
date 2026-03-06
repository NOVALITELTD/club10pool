'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Login failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      router.push('/dashboard')
    } catch {
      setError('Server error, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '40px 36px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg,#c9a84c,#a07830)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0a0c0f', fontSize: 22, fontWeight: 800,
            margin: '0 auto 16px',
          }}>C</div>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Club10 Pool</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Admin Portal</div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            color: '#ef4444', fontSize: 13,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@club10pool.com"
              style={{
                width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
              style={{
                width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleLogin} disabled={loading}
            style={{
              width: '100%', background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: 8, padding: '12px',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 8,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Club10 Pool Manager · Admin Access Only
        </div>
      </div>
    </div>
  )
}