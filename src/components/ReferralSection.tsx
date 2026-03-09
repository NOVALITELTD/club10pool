'use client'
// src/components/ReferralSection.tsx
// Drop-in replacement for the referral section inside InvestorDashboard
import { useState, useEffect } from 'react'

const POOL_CATEGORIES = {
  CENT:         { label: '$100 Pool',    targetUsd: 100,   minUsd: 10,   maxUsd: 50,   color: '#00d4aa', icon: '◈' },
  STANDARD_1K:  { label: '$1,000 Pool',  targetUsd: 1000,  minUsd: 100,  maxUsd: 500,  color: '#818cf8', icon: '◈' },
  STANDARD_5K:  { label: '$5,000 Pool',  targetUsd: 5000,  minUsd: 1000, maxUsd: 2500, color: '#c9a84c', icon: '◈' },
  STANDARD_10K: { label: '$10,000 Pool', targetUsd: 10000, minUsd: 2500, maxUsd: 5000, color: '#f59e0b', icon: '◈' },
} as const

type Step = 'intro' | 'terms' | 'category' | 'active'

const TERMS = `REFERRAL POOL TERMS & CONDITIONS

1. ELIGIBILITY
   You must have an approved KYC status to create a referral pool.

2. POOL CREATION
   You may create one referral pool per category at a time. A new pool in the same category may only be created once the previous one is closed.

3. REFERRAL PROCESS
   Share your unique referral link. Each person who registers via your link and completes KYC will be automatically assigned to your pool.

4. POOL ACTIVATION
   Once 10 members have joined, the pool will be reviewed and activated by an admin with live trading account credentials.

5. REBATE BONUS
   As pool creator, you earn a 10% bonus on the pool's monthly trading account rebate. This is credited by admin at month-end and will appear in your dashboard.

6. CONTRIBUTION LIMITS
   - $100 Pool: $10 – $50 per member
   - $1,000 Pool: $100 – $500 per member
   - $5,000 Pool: $1,000 – $2,500 per member
   - $10,000 Pool: $2,500 – $5,000 per member
   Amounts must be rounded to the nearest $10.

7. PAYMENT
   All contributions are paid in NGN at the real-time USD/NGN exchange rate via Flutterwave.

8. GENERAL
   Nova-Lite reserves the right to suspend or terminate any referral pool found to be in violation of platform policies.

By proceeding, you confirm you have read and agree to these terms.`

interface ReferralSectionProps {
  token: string
  s: any // shared style object from dashboard
}

export default function ReferralSection({ token, s }: ReferralSectionProps) {
  const [step, setStep] = useState<Step>('intro')
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedPool, setExpandedPool] = useState<string | null>(null)

  useEffect(() => {
    loadPools()
  }, [])

  async function loadPools() {
    setLoading(true)
    try {
      const res = await fetch('/api/referrals/my', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) {
        setPools(data.data || [])
        if ((data.data || []).length > 0) setStep('active')
      }
    } finally { setLoading(false) }
  }

  async function createPool() {
    if (!selectedCategory) return
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/referrals/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: selectedCategory }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create pool'); return }
      await loadPools()
      setStep('active')
    } finally { setCreating(false) }
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/${code}`
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // ── INTRO ─────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⬡</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Referral Pools</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
          Create your own investment pool, invite 9 others, and earn a <span style={{ color: '#c9a84c', fontWeight: 700 }}>10% monthly rebate bonus</span> just for being the pool creator.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { icon: '🔗', title: 'Create & Share', desc: 'Generate a unique referral link for your chosen pool category' },
          { icon: '👥', title: 'Fill Your Pool', desc: 'Invite 9 others to join. They register, complete KYC, and contribute' },
          { icon: '🚀', title: 'Pool Activates', desc: 'Admin activates the pool with live MT4/MT5 trading credentials' },
          { icon: '💰', title: 'Earn Rebates', desc: 'Receive 10% of the pool\'s monthly trading account rebate' },
        ].map(item => (
          <div key={item.title} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setStep('terms')}
        style={{ width: '100%', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 12, padding: '15px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Get Started →
      </button>
    </div>
  )

  // ── TERMS ─────────────────────────────────────────────────────
  if (step === 'terms') return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Terms & Conditions</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Please read carefully before proceeding</div>
        <div style={{ background: '#080a0f', borderRadius: 10, padding: 16, maxHeight: 320, overflowY: 'auto', fontSize: 12, color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-line', fontFamily: "'JetBrains Mono', monospace" }}>
          {TERMS}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setStep('intro')} style={{ flex: 1, background: 'transparent', border: '1px solid #1e2530', color: '#64748b', borderRadius: 10, padding: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button onClick={() => setStep('category')} style={{ flex: 2, background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          I Accept — Choose Pool Category →
        </button>
      </div>
    </div>
  )

  // ── CATEGORY SELECTION ────────────────────────────────────────
  if (step === 'category') return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Choose Pool Category</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>Select the investment size for your referral pool. You can only create one active pool per category.</div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>⚠ {error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {Object.entries(POOL_CATEGORIES).map(([key, cfg]) => {
          const isSelected = selectedCategory === key
          const alreadyHas = pools.some(p => p.category === key && ['OPEN', 'FULL', 'ACTIVE'].includes(p.status))
          return (
            <div
              key={key}
              onClick={() => !alreadyHas && setSelectedCategory(key)}
              style={{
                background: '#0d1117',
                border: `1px solid ${isSelected ? cfg.color : alreadyHas ? '#1e2530' : '#1e2530'}`,
                borderRadius: 12, padding: '18px 20px', cursor: alreadyHas ? 'not-allowed' : 'pointer',
                opacity: alreadyHas ? 0.5 : 1,
                outline: isSelected ? `2px solid ${cfg.color}44` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: cfg.color, marginBottom: 4 }}>{cfg.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Contribution: ${cfg.minUsd} – ${cfg.maxUsd} · 10 members · Target: ${cfg.targetUsd.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {alreadyHas && <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '2px 8px' }}>ACTIVE</span>}
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? cfg.color : '#1e2530'}`, background: isSelected ? cfg.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', flexShrink: 0 }}>
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setStep('terms')} style={{ flex: 1, background: 'transparent', border: '1px solid #1e2530', color: '#64748b', borderRadius: 10, padding: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back
        </button>
        <button
          onClick={createPool}
          disabled={!selectedCategory || creating}
          style={{ flex: 2, background: selectedCategory ? 'linear-gradient(135deg,#c9a84c,#a07830)' : '#1e2530', color: selectedCategory ? '#000' : '#64748b', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 800, cursor: selectedCategory ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.2s' }}
        >
          {creating ? 'Creating Pool...' : 'Create Referral Pool →'}
        </button>
      </div>
    </div>
  )

  // ── ACTIVE VIEW ───────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>My Referral Pools</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{pools.length} pool{pools.length !== 1 ? 's' : ''} created</div>
        </div>
        <button
          onClick={() => { setSelectedCategory(null); setStep('terms') }}
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + New Pool
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading your pools...</div>
      ) : pools.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
          <div style={{ color: '#64748b' }}>No referral pools yet. Create your first one.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pools.map(pool => {
            const cfg = POOL_CATEGORIES[pool.category as keyof typeof POOL_CATEGORIES]
            const referralUrl = `${appUrl}/${pool.referralCode}`
            const isExpanded = expandedPool === pool.id
            const statusColor = pool.status === 'ACTIVE' ? '#00d4aa' : pool.status === 'FULL' ? '#f59e0b' : pool.status === 'OPEN' ? '#818cf8' : '#64748b'

            return (
              <div key={pool.id} style={{ background: '#0d1117', border: `1px solid ${cfg?.color || '#1e2530'}22`, borderRadius: 14 }}>
                {/* Pool header */}
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: cfg?.color }}>{cfg?.label}</span>
                      <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}44`, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{pool.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {pool.members?.length || 0} / 10 members · Created {new Date(pool.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={() => setExpandedPool(isExpanded ? null : pool.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, fontFamily: 'inherit' }}>
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '0 24px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                    <span>Pool capacity</span>
                    <span style={{ color: cfg?.color }}>{pool.members?.length || 0}/10</span>
                  </div>
                  <div style={{ height: 6, background: '#1e2530', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${((pool.members?.length || 0) / 10) * 100}%`, background: `linear-gradient(90deg, ${cfg?.color}, ${cfg?.color}88)`, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>

                {/* Referral link + copy */}
                {pool.status === 'OPEN' && (
                  <div style={{ padding: '0 24px 20px' }}>
                    <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Your Referral Link</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1, background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {referralUrl}
                      </div>
                      <button
                        onClick={() => copyLink(pool.referralCode)}
                        style={{ flexShrink: 0, background: copied === pool.referralCode ? 'rgba(0,212,170,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${copied === pool.referralCode ? 'rgba(0,212,170,0.3)' : 'rgba(201,168,76,0.3)'}`, color: copied === pool.referralCode ? '#00d4aa' : '#c9a84c', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                      >
                        {copied === pool.referralCode ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded: members + rebates + trading details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #1e2530', padding: '20px 24px' }}>
                    {/* Trading details if active */}
                    {pool.batch?.status === 'ACTIVE' && pool.batch?.tradingAccountId && (
                      <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#00d4aa', marginBottom: 12 }}>🖥 Trading Account Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                          {[
                            ['Platform', pool.batch.tradingPlatform],
                            ['Broker', pool.batch.brokerName],
                            ['Account ID', pool.batch.tradingAccountId],
                            ['Server', pool.batch.tradingServer],
                          ].map(([label, val]) => val ? (
                            <div key={label}>
                              <div style={{ color: '#64748b', marginBottom: 2 }}>{label}</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0', fontSize: 12 }}>{val}</div>
                            </div>
                          ) : null)}
                        </div>
                        {pool.batch.investorPassword && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>Investor Password (read-only)</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#c9a84c', fontSize: 12 }}>{pool.batch.investorPassword}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Members */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Members ({pool.members?.length || 0}/10)</div>
                      {pool.members?.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pool.members.map((m: any, i: number) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#080a0f', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, color: '#00d4aa' }}>{i + 1}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{m.investor.fullName}</div>
                                <div style={{ color: '#64748b', fontSize: 11 }}>Joined {new Date(m.joinedAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#64748b', fontSize: 13 }}>No members yet. Share your referral link!</div>
                      )}
                    </div>

                    {/* Rebates */}
                    {pool.rebates?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Monthly Rebates</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pool.rebates.map((r: any) => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080a0f', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{new Date(r.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                                <div style={{ color: '#64748b', fontSize: 11 }}>Total rebate: ${parseFloat(r.totalRebate).toLocaleString()}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, color: '#c9a84c', fontSize: 14 }}>+${parseFloat(r.creatorBonus).toLocaleString()}</div>
                                <div style={{ fontSize: 11, color: r.status === 'CREDITED' ? '#00d4aa' : '#f59e0b' }}>{r.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
