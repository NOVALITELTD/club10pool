// src/app/[referralCode]/page.tsx
// Public landing page for referral links — /{referralCode}
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORY_CONFIG: Record<string, { min: number; max: number; color: string; icon: string }> = {
  CENT:         { min: 10,   max: 50,   color: '#00d4aa', icon: '💎' },
  STANDARD_1K:  { min: 100,  max: 500,  color: '#818cf8', icon: '⭐' },
  STANDARD_5K:  { min: 1000, max: 2500, color: '#f59e0b', icon: '🏆' },
  STANDARD_10K: { min: 2500, max: 5000, color: '#c9a84c', icon: '👑' },
}

function roundUpToNearest10(n: number) {
  return Math.ceil(n / 10) * 10
}

export default function ReferralLandingPage({ params }: { params: { referralCode: string } }) {
  const router = useRouter()
  const { referralCode } = params

  const [pool, setPool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Join flow state
  const [step, setStep] = useState<'info' | 'amount' | 'paying' | 'done'>('info')
  const [contributionInput, setContributionInput] = useState('')
  const [rounded, setRounded] = useState(0)
  const [joinError, setJoinError] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [joiningLoading, setJoiningLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/referrals/${referralCode}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setNotFound(true); setLoading(false); return }
        setPool(d.data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [referralCode])

  // Round on input change
  useEffect(() => {
    const val = parseFloat(contributionInput)
    if (!isNaN(val) && val > 0) setRounded(roundUpToNearest10(val))
    else setRounded(0)
  }, [contributionInput])

  async function handleJoinAndPay() {
    setJoinError('')
    const token = localStorage.getItem('token')
    if (!token) {
      // Save referral code, redirect to register
      localStorage.setItem('pendingReferral', referralCode)
      router.push(`/login?referral=${referralCode}`)
      return
    }

    setJoiningLoading(true)
    try {
      // Step 1: Join the referral pool
      const joinRes = await fetch('/api/referrals/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralCode, contributionUSD: rounded }),
      })
      const joinData = await joinRes.json()
      if (!joinRes.ok) { setJoinError(joinData.error || 'Failed to join pool'); setJoiningLoading(false); return }

      // Step 2: Initiate payment
      const payRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'referral', referralMemberId: joinData.data.memberId }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) { setJoinError(payData.error || 'Failed to initiate payment'); setJoiningLoading(false); return }

      // Redirect to Flutterwave hosted checkout
      window.location.href = payData.data.paymentLink
    } catch {
      setJoinError('Something went wrong. Please try again.')
      setJoiningLoading(false)
    }
  }

  const s: any = {
    page: { minHeight: '100vh', background: '#080a0f', color: '#e2e8f0', fontFamily: "'DM Mono', 'Courier New', monospace" },
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 16, padding: 28 },
    input: { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, padding: '13px 16px', color: '#e2e8f0', fontSize: 18, fontWeight: 700, boxSizing: 'border-box' as const, outline: 'none' },
    btn: { background: 'linear-gradient(135deg,#00d4aa,#0099aa)', color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 15, cursor: 'pointer', width: '100%' },
  }

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, border: '3px solid #1e2530', borderTopColor: '#00d4aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pool Not Found</div>
        <div style={{ color: '#64748b', marginBottom: 28 }}>This referral link is invalid or has expired.</div>
        <Link href="/login" style={{ color: '#00d4aa', textDecoration: 'none', fontSize: 14 }}>← Go to Login</Link>
      </div>
    </div>
  )

  const cfg = CATEGORY_CONFIG[pool.category] || CATEGORY_CONFIG.CENT
  const progress = (Number(pool.currentAmount) / Number(pool.targetAmount)) * 100

  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e2530', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Club10" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>NOVA-LITE</div>
            <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 3 }}>CLUB10 POOL</div>
          </div>
        </div>
        <Link href="/login" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none', border: '1px solid #1e2530', borderRadius: 8, padding: '6px 14px' }}>Login / Register</Link>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px 60px' }}>
        {/* Pool Info Card */}
        <div style={{ ...s.card, border: `1px solid ${cfg.color}44`, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{cfg.icon}</div>
          <div style={{ fontSize: 11, color: cfg.color, letterSpacing: 3, marginBottom: 6 }}>REFERRAL INVITATION</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{pool.categoryLabel}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Invited by <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{pool.creatorName}</span>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>Pool Progress</span>
              <span style={{ color: cfg.color }}>
                ${Number(pool.currentAmount).toLocaleString()} / ${Number(pool.targetAmount).toLocaleString()}
              </span>
            </div>
            <div style={{ height: 8, background: '#1e2530', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: `linear-gradient(90deg,${cfg.color},${cfg.color}aa)`, borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            {pool.paidMemberCount} member{pool.paidMemberCount !== 1 ? 's' : ''} joined ·
            Contribution range: <span style={{ color: cfg.color }}>${pool.minContribution}–${pool.maxContribution}</span>
          </div>
        </div>

        {/* How it works */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>📋 How It Works</div>
          {[
            ['1', 'Create or log into your Club10 Pool account'],
            ['2', 'Complete KYC verification (one-time, 24–48 hrs)'],
            ['3', `Choose your contribution: $${pool.minContribution}–$${pool.maxContribution} (rounds up to nearest $10)`],
            ['4', 'Pay securely via Flutterwave in Naira'],
            ['5', 'Get MT4/MT5 trading credentials once pool activates'],
            ['6', 'Earn monthly profit distributions'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>{n}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{text}</div>
            </div>
          ))}
        </div>

        {pool.status === 'FULL' ? (
          <div style={{ ...s.card, textAlign: 'center', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, color: '#f59e0b' }}>Pool is Full</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>This pool has reached its target. It is awaiting admin activation.</div>
          </div>
        ) : step === 'info' ? (
          <div style={{ ...s.card, border: `1px solid ${cfg.color}44` }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Join This Pool</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' as const }}>
                Your Contribution (USD)
              </label>
              <input
                type="number"
                placeholder={`$${pool.minContribution}–$${pool.maxContribution}`}
                value={contributionInput}
                onChange={e => setContributionInput(e.target.value)}
                style={s.input}
                min={pool.minContribution}
                max={pool.maxContribution}
              />
              {rounded > 0 && rounded !== parseFloat(contributionInput) && (
                <div style={{ fontSize: 12, color: cfg.color, marginTop: 6 }}>
                  → Rounded up to nearest $10: <strong>${rounded}</strong>
                </div>
              )}
              {rounded > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  You will pay approximately <strong>₦{(rounded * 1600).toLocaleString()}</strong> (rate shown at checkout)
                </div>
              )}
            </div>
            {joinError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}>
                ⚠ {joinError}
              </div>
            )}
            <button
              style={{ ...s.btn, opacity: rounded < pool.minContribution ? 0.5 : 1, cursor: rounded < pool.minContribution ? 'not-allowed' : 'pointer' }}
              onClick={handleJoinAndPay}
              disabled={joiningLoading || rounded < pool.minContribution}
            >
              {joiningLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid #00000044', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Processing...
                </span>
              ) : `Join & Pay $${rounded || pool.minContribution} →`}
            </button>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 12, textAlign: 'center' }}>
              You must have an account and approved KYC to join. Payment in Naira via Flutterwave.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
