// src/app/payment/verify/page.tsx
'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Create a separate component that uses useSearchParams
function PaymentVerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const txRef = searchParams.get('tx_ref')
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!txRef) { 
      router.push('/dashboard'); 
      return 
    }

    const token = localStorage.getItem('token')
    if (!token) { 
      router.push('/login'); 
      return 
    }

    // Poll for payment status (webhook may take a few seconds)
    let attempts = 0
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/verify?tx_ref=${txRef}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const d = await res.json()
        if (d.data?.status === 'SUCCESS') {
          setData(d.data)
          setStatus('success')
          return
        }
        if (d.data?.status === 'FAILED') {
          setData(d.data)
          setStatus('failed')
          return
        }
        // Still pending — retry
        attempts++
        if (attempts < 10) setTimeout(poll, 2000)
        else setStatus('pending')
      } catch {
        setStatus('failed')
      }
    }

    poll()
  }, [txRef, router])

  const base: React.CSSProperties = {
    minHeight: '100vh',
    background: '#080a0f',
    color: '#e2e8f0',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }

  if (status === 'loading') return (
    <div style={base}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, border: '3px solid #1e2530', borderTopColor: '#00d4aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirming Payment...</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>Please wait while we verify your transaction</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )

  if (status === 'success') return (
    <div style={base}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>✓</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#00d4aa' }}>Payment Confirmed!</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your payment of <strong style={{ color: '#c9a84c' }}>${Number(data?.amountUSD).toLocaleString()}</strong>{' '}
          (₦{Number(data?.amountNGN).toLocaleString()}) has been confirmed.
          You are now an active member of the pool.
        </div>
        {data?.poolCategory && (
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, fontSize: 13, color: '#94a3b8' }}>
            📊 Pool: <strong style={{ color: '#c9a84c' }}>{data.poolCategory}</strong>
            {data.poolStatus === 'FULL' && (
              <div style={{ marginTop: 8, color: '#f59e0b' }}>
                ⏳ Pool is full — awaiting admin activation. You'll receive trading details by email once activated.
              </div>
            )}
          </div>
        )}
        <Link href="/dashboard" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#00d4aa,#0099aa)', color: '#000', fontWeight: 800, fontSize: 14, padding: '14px 36px', borderRadius: 10, textDecoration: 'none' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )

  if (status === 'failed') return (
    <div style={base}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>✕</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>Payment Failed</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your payment could not be processed. No funds have been deducted. Please try again.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 14, padding: '14px 36px', borderRadius: 10, textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )

  // Pending (webhook delayed)
  return (
    <div style={base}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Payment Processing</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Your payment is being verified. This may take a few minutes. 
          Check your dashboard for the updated status.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', background: '#0d1117', border: '1px solid #1e2530', color: '#e2e8f0', fontWeight: 700, fontSize: 14, padding: '14px 36px', borderRadius: 10, textDecoration: 'none' }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        background: '#080a0f', 
        color: '#e2e8f0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: "'DM Mono', 'Courier New', monospace"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, border: '3px solid #1e2530', borderTopColor: '#00d4aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
          <div>Loading...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  )
}
