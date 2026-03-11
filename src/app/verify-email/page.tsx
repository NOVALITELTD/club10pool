// src/app/verify-email/page.tsx
'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function VerifyEmailContent() {
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

          // If a JWT token is returned, update localStorage so user stays logged in
          if (d.data?.token) {
            localStorage.setItem('token', d.data.token)
          }

          // Update emailVerified flag if user object exists
          const user = localStorage.getItem('user')
          if (user) {
            const parsed = JSON.parse(user)
            localStorage.setItem('user', JSON.stringify({ ...parsed, emailVerified: true }))
          }

          // Check if user has a valid token — if yes go to KYC, if not go to login
          const hasToken = !!localStorage.getItem('token')
          setTimeout(() => {
            if (hasToken) {
              router.push('/kyc')
            } else {
              router.push('/login?verified=1')
            }
          }, 2500)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#06080d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', padding: 40, maxWidth: 440 }}>
        {status === 'loading' && (
          <div style={{ color: '#c9a84c', fontSize: 16 }}>Verifying your email...</div>
        )}
        {status === 'success' && (
          <div>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>Email Verified!</div>
            <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              Your email has been confirmed.<br />
              Redirecting you now...
            </div>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>✕</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Invalid or Expired Link</div>
            <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              This verification link has expired or already been used. Please log in and request a new one.
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{ background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#06080d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a84c' }}>Loading...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
