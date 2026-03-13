'use client'
// src/app/test/simulate-payment/page.tsx
// ⚠️ REMOVE THIS FILE AND THE API ROUTE BEFORE GOING TO PRODUCTION

import { useState } from 'react'

export default function SimulatePaymentPage() {
  const [txRef, setTxRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function simulate() {
    if (!txRef.trim()) { setError('Paste the tx_ref first'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/test/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txRef: txRef.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Something went wrong'); return }
      setResult(d)
    } finally { setLoading(false) }
  }

  const s = {
    page: { minHeight: '100vh', background: '#080a0f', color: '#e2e8f0', fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 } as React.CSSProperties,
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Warning banner */}
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#ef4444' }}>
          ⚠️ <strong>TEST ONLY</strong> — Remove this page before going to production
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>💳 Simulate Payment</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          Use this to bypass NowPayments during testing.<br />
          Start a payment normally, copy the <code style={{ color: '#00d4aa' }}>tx_ref</code> from the URL, paste it here.
        </div>

        {/* Steps */}
        <div style={{ background: '#080a0f', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#94a3b8', lineHeight: 2 }}>
          <div><span style={{ color: '#00d4aa' }}>1.</span> Click "Join & Pay" on a batch</div>
          <div><span style={{ color: '#00d4aa' }}>2.</span> You'll be redirected to NowPayments</div>
          <div><span style={{ color: '#00d4aa' }}>3.</span> Copy the <code style={{ color: '#c9a84c' }}>tx_ref</code> from the browser URL bar</div>
          <div style={{ fontSize: 11, color: '#475569', paddingLeft: 16 }}>e.g. <code>/payment/verify?tx_ref=<strong style={{ color: '#c9a84c' }}>C10-XXXXXXXXXXXX</strong></code></div>
          <div><span style={{ color: '#00d4aa' }}>4.</span> Come back here and paste it below</div>
          <div><span style={{ color: '#00d4aa' }}>5.</span> Click Simulate — then go to your dashboard</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }}>Transaction Reference (tx_ref)</label>
          <input
            value={txRef}
            onChange={e => { setTxRef(e.target.value); setError('') }}
            placeholder="C10-XXXXXXXXXXXX"
            style={{ width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '12px 14px', color: '#00d4aa', fontSize: 15, fontFamily: 'monospace', boxSizing: 'border-box' as const, outline: 'none' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {result && (
          <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 8 }}>✓ Payment Simulated!</div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
              <div>Type: <strong style={{ color: '#e2e8f0' }}>{result.type}</strong></div>
              <div>Amount: <strong style={{ color: '#c9a84c' }}>${result.amountUSD}</strong></div>
              <div>Investor ID: <code style={{ color: '#475569', fontSize: 11 }}>{result.investorId}</code></div>
            </div>
            <a
              href={`/payment/verify?tx_ref=${txRef}`}
              style={{ display: 'inline-block', marginTop: 12, background: 'linear-gradient(135deg,#00d4aa,#0099aa)', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}
            >
              View Success Page →
            </a>
          </div>
        )}

        <button
          onClick={simulate}
          disabled={loading || !txRef.trim()}
          style={{ width: '100%', background: '#00d4aa', color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: !txRef.trim() ? 0.5 : 1 }}
        >
          {loading ? 'Simulating...' : '⚡ Simulate Payment'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/dashboard" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Back to Dashboard</a>
        </div>
      </div>
    </div>
  )
}