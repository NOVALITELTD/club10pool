'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { setStatus('error'); return }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStatus('success')
          // Update stored user
          const user = localStorage.getItem('user')
          if (user) {
            const parsed = JSON.parse(user)
            localStorage.setItem('user', JSON.stringify({ ...parsed, emailVerified: true }))
          }
          setTimeout(() => router.push('/kyc'), 2000)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        {status === 'loading' && <div style={{ color: 'var(--accent)', fontSize: 16 }}>Verifying your email...</div>}
        {status === 'success' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>Email Verified!</div>
            <div style={{ color: 'var(--muted)', marginTop: 8 }}>Redirecting to KYC setup...</div>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✕</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>Invalid or expired link</div>
            <button onClick={() => router.push('/login')} style={{ marginTop: 16, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}