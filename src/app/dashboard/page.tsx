// src/app/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Section = 'portfolio' | 'batches' | 'withdrawals' | 'settings' | 'support'

export default function InvestorDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('portfolio')
  const [user, setUser] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [myBatch, setMyBatch] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [withdrawal, setWithdrawal] = useState<any>(null)
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    // Auto-collapse sidebar on mobile
    if (window.innerWidth < 768) setSidebarOpen(false)

    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    const parsed = JSON.parse(userData)
    if (parsed.isAdmin) { router.push('/admin'); return }
    if (parsed.kycStatus !== 'APPROVED') { router.push('/kyc'); return }
    setUser(parsed)
    loadData(token)
    // Fetch fresh profile from DB (localStorage may be stale after settings update)
    fetch('/api/investors/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setUser((prev: any) => ({ ...prev, ...d.data })) })
      .catch(() => {})

    // Background auto-refresh every 5 minutes (silent, no loading spinner)
    const interval = setInterval(() => {
      const t = localStorage.getItem('token')
      if (!t) return
      const headers = { Authorization: `Bearer ${t}` }
      Promise.all([
        fetch('/api/batches', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/transactions/my', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/withdrawals/my', { headers }).then(r => r.ok ? r.json() : null),
      ]).then(([batchData, txData, wdData]) => {
        if (batchData?.data) {
          setBatches(batchData.data)
          setMyBatch(batchData.data.find((b: any) => b.myMembership) || null)
        }
        if (txData?.data) setTransactions(txData.data)
        if (wdData?.data) setWithdrawal(wdData.data)
      }).catch(() => {})
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  async function loadData(token: string) {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [batchRes, txRes, wdRes, broadcastRes] = await Promise.all([
        fetch('/api/batches', { headers }),
        fetch('/api/transactions/my', { headers }),
        fetch('/api/withdrawals/my', { headers }),
        fetch('/api/broadcast', { headers }),
      ])
      if (batchRes.ok) {
        const d = await batchRes.json()
        const all = d.data || []
        setBatches(all)
        const active = all.find((b: any) => b.myMembership)
        setMyBatch(active || null)
      }
      if (txRes.ok) { const d = await txRes.json(); setTransactions(d.data || []) }
      if (wdRes.ok) { const d = await wdRes.json(); setWithdrawal(d.data || null) }
      if (broadcastRes.ok) { const d = await broadcastRes.json(); setBroadcasts(d.data || []) }
    } finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); router.push('/login') }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'portfolio', label: 'My Portfolio', icon: '◈' },
    { id: 'batches', label: 'Batches', icon: '⬡' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⟁' },
    { id: 'referral' as any, label: 'Referral', icon: '🔗' },
    { id: 'notifications' as any, label: 'Notifications', icon: '🔔' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'support', label: 'Support', icon: '💬' },
  ]

  const s: any = {
    app: { display: 'flex', minHeight: '100vh', background: '#080a0f', color: '#e2e8f0', fontFamily: "'DM Mono', 'Courier New', monospace" },
    sidebar: { width: sidebarOpen ? 240 : 68, background: '#0d1117', borderRight: '1px solid #1e2530', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0 },
    logo: { padding: '20px 16px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' },
    nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(0,212,170,0.1)' : 'transparent', color: active ? '#00d4aa' : '#64748b', border: active ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', fontSize: 13, fontWeight: active ? 600 : 400 }),
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
    topbar: { padding: '16px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117', flexShrink: 0 },
    content: { flex: 1, padding: 20, overflowY: 'auto' },
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24 },
    tag: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }),
    btn: (variant: 'primary' | 'danger' | 'ghost' = 'primary') => ({
      padding: '10px 20px', borderRadius: 8, cursor: 'pointer' as const, fontSize: 13, fontWeight: 600,
      background: variant === 'primary' ? '#00d4aa' : variant === 'danger' ? '#ef4444' : 'transparent',
      color: variant === 'primary' ? '#000' : variant === 'danger' ? '#fff' : '#64748b',
      border: variant === 'ghost' ? '1px solid #1e2530' : 'none',
    } as React.CSSProperties),
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 14px', color: '#64748b', borderBottom: '1px solid #1e2530', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const },
    td: { padding: '12px 14px', borderBottom: '1px solid #0f1520' },
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .dash-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform 0.25s ease !important;
            width: 240px !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.5);
          }
          .dash-sidebar.open {
            transform: translateX(0) !important;
          }
          .dash-mobile-overlay {
            display: none;
            position: fixed; inset: 0; z-index: 199;
            background: rgba(0,0,0,0.6);
          }
          .dash-mobile-overlay.open { display: block; }
          .dash-mobile-nav { display: flex !important; }
          .dash-content { padding: 16px !important; }
          .dash-topbar { padding: 12px 16px !important; }
        }
        @media (min-width: 769px) {
          .dash-mobile-nav { display: none !important; }
          .dash-mobile-overlay { display: none !important; }
        }
        .dash-mobile-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: #0d1117; border-top: 1px solid #1e2530;
          justify-content: space-around; align-items: center;
          padding: 8px 0; gap: 0;
        }
        .mobile-nav-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 6px 12px; border-radius: 8px; cursor: pointer;
          color: #64748b; font-size: 10px; background: none; border: none;
          font-family: 'DM Mono', 'Courier New', monospace; flex: 1;
          transition: color 0.15s;
        }
        .mobile-nav-item.active { color: #00d4aa; }
        .mobile-nav-item span.icon { font-size: 18px; }
        @media (max-width: 768px) {
          .dash-main { padding-bottom: 70px; }
        }
      `}</style>

      <div style={s.app}>
        {/* SIDEBAR — desktop only */}
        <div className={`dash-mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <div className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`} style={s.sidebar}>
          <div style={s.logo}>
            <img
              src="/logo.png"
              alt="Club10"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
              onError={e => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                const fb = el.nextElementSibling as HTMLElement
                if (fb) fb.style.display = 'flex'
              }}
            />
            {/* Fallback icon */}
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#0099aa)', display: 'none', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#fff', flexShrink: 0 }}>C</div>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0', whiteSpace: 'nowrap' }}>Club10 Pool</div>
                <div style={{ fontSize: 9, color: '#00d4aa', letterSpacing: 2, whiteSpace: 'nowrap' }}>INVESTOR</div>
              </div>
            )}
          </div>

          <div style={s.nav}>
            {navItems.map(item => (
              <div key={item.id} style={s.navItem(section === item.id)} onClick={() => { setSection(item.id as Section); if (window.innerWidth < 768) setSidebarOpen(false) }}>
                <span style={{ fontSize: 19, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 12px', borderTop: '1px solid #1e2530' }}>
            {sidebarOpen && (
              <div style={{ fontSize: 11, color: '#64748b', padding: '0 12px', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>
            )}
            <div
              style={{ ...s.navItem(false), color: '#ef4444' }}
              onClick={logout}
              title="Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {sidebarOpen && <span>Logout</span>}
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="dash-main" style={s.main}>
          {/* Topbar */}
          <div className="dash-topbar" style={s.topbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setSidebarOpen(p => !p)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="dash-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.png" alt="Club10" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>Club10 Pool</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#00d4aa', fontSize: 10 }}>●</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="dash-content" style={s.content}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>Loading...</div>
            ) : (
              <>
                {section === 'portfolio' && <PortfolioSection myBatch={myBatch} transactions={transactions} s={s} setSection={setSection} />}
                {/* Broadcast banner — shows at top of every section */}
                {broadcasts.length > 0 && <BroadcastBanner broadcasts={broadcasts} />}

                {section === 'batches' && <BatchesSection batches={batches} myBatch={myBatch} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'withdrawals' && <WithdrawalsSection withdrawal={withdrawal} myBatch={myBatch} user={user} token={token!} s={s} reload={() => loadData(token!)} />}
                {(section as any) === 'referral' && <ReferralSection token={token!} user={user} s={s} />}
                {(section as any) === 'notifications' && <NotificationsSection token={token!} user={user} s={s} />}
                {section === 'settings' && <SettingsSection user={user} token={token!} s={s} setUser={setUser} />}
                {(section as any) === 'support' && <SupportSection s={s} />}

              </>
            )}
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="dash-mobile-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id as Section)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── EXCHANGE RATE HOOK ────────────────────────────────────
function useUsdNgnRate() {
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(d => setRate(d.rates?.NGN || null))
      .catch(() => setRate(null))
  }, [])
  return rate
}

function NgnEquiv({ usd, rate }: { usd: number; rate: number | null }) {
  if (!rate || !usd) return null
  return (
    <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
      ≈ ₦{(usd * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
    </div>
  )
}

// ── PORTFOLIO ─────────────────────────────────────────────
function PortfolioSection({ myBatch, transactions, s, setSection }: any) {
  const rate = useUsdNgnRate()

  if (!myBatch) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>⬡</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Active Batch</div>
      <div style={{ color: '#64748b', fontSize: 16, marginBottom: 28 }}>You are not currently part of any investment batch.</div>
      <button style={s.btn()} onClick={() => setSection('batches')}>Browse Available Batches</button>
    </div>
  )

  const membership = myBatch.myMembership
  const capital = parseFloat(membership?.capitalAmount || 0)
  const sharePercent = parseFloat(membership?.sharePercent || 0)
  const totalProfit = transactions.filter((t: any) => t.type === 'PROFIT_SHARE').reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Capital Invested', value: `$${capital.toLocaleString()}`, usd: capital, color: '#00d4aa' },
          { label: 'Share Percent', value: `${sharePercent.toFixed(2)}%`, usd: null, color: '#c9a84c' },
          { label: 'Total Profit Earned', value: `$${totalProfit.toLocaleString()}`, usd: totalProfit, color: '#818cf8' },
          { label: 'Batch Status', value: myBatch.status, usd: null, color: myBatch.status === 'ACTIVE' ? '#00d4aa' : '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            {stat.usd !== null && <NgnEquiv usd={stat.usd} rate={rate} />}
            <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{myBatch.name}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{myBatch.batchCode} · {myBatch.brokerName || 'No broker set'}</div>
        <div style={{ background: '#080a0f', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#00d4aa,#0099aa)', width: `${Math.min(100, (myBatch._count?.members || 0) / myBatch.targetMembers * 100)}%`, transition: 'width 0.5s ease', borderRadius: 8 }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{myBatch._count?.members || 0} / {myBatch.targetMembers} members</div>
      </div>

      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Transaction History</div>
          {rate && <div style={{ fontSize: 11, color: '#475569' }}>Rate: $1 = ₦{rate.toLocaleString()}</div>}
        </div>
        {transactions.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead><tr>{['Type', 'Amount', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {transactions.slice(0, 10).map((tx: any) => (
                  <tr key={tx.id}>
                    <td style={s.td}><span style={{ color: tx.type === 'PROFIT_SHARE' ? '#00d4aa' : tx.type === 'DEPOSIT' ? '#818cf8' : '#94a3b8', fontSize: 12 }}>{tx.type}</span></td>
                    <td style={s.td}>
                      <span style={{ fontWeight: 600, color: '#c9a84c' }}>${parseFloat(tx.amount).toLocaleString()}</span>
                      <NgnEquiv usd={parseFloat(tx.amount)} rate={rate} />
                    </td>
                    <td style={s.td}><span style={s.tag(tx.status === 'CONFIRMED' ? '#00d4aa' : '#f59e0b')}>{tx.status}</span></td>
                    <td style={s.td}><span style={{ fontSize: 11, color: '#64748b' }}>{new Date(tx.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No transactions yet</div>}
      </div>
    </div>
  )
}

// ── BATCHES ───────────────────────────────────────────────
const BATCH_CATEGORY_CONFIG: Record<string, { min: number; max: number; color: string; label: string }> = {
  CENT:         { min: 10,   max: 50,   color: '#00d4aa', label: '$100 Pool'    },
  STANDARD_1K:  { min: 100,  max: 500,  color: '#818cf8', label: '$1,000 Pool'  },
  STANDARD_5K:  { min: 1000, max: 2500, color: '#f59e0b', label: '$5,000 Pool'  },
  STANDARD_10K: { min: 2500, max: 5000, color: '#c9a84c', label: '$10,000 Pool' },
}

function BatchesSection({ batches, myBatch, token, s, reload }: any) {
  const rate = useUsdNgnRate()
  const [payingBatch, setPayingBatch] = useState<any>(null)
  const [amountInput, setAmountInput] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  const rounded = amountInput ? Math.ceil(parseFloat(amountInput) / 10) * 10 : 0

  async function initiatePayment() {
    setPayError(''); setPayLoading(true)
    const cfg = BATCH_CATEGORY_CONFIG[payingBatch.category] || {
      min: Number(payingBatch.minContribution || payingBatch.contributionPerMember || 10),
      max: Number(payingBatch.maxContribution || payingBatch.targetAmount || payingBatch.targetCapital || 50),
    }
    if (!rounded || rounded < cfg.min || rounded > cfg.max) {
      setPayError(`Amount must be $${cfg.min}–$${cfg.max}`); setPayLoading(false); return
    }
    try {
      const joinRes = await fetch(`/api/batches/${payingBatch.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ capitalAmount: rounded }),
      })
      const joinData = await joinRes.json()
      if (!joinRes.ok) { setPayError(joinData.error || 'Failed to join'); setPayLoading(false); return }
      const payRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'batch', batchId: payingBatch.id, capitalAmount: rounded }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) { setPayError(payData.error || 'Payment failed'); setPayLoading(false); return }
      window.location.href = payData.data.paymentLink
    } catch { setPayError('Something went wrong.'); setPayLoading(false) }
  }

  return (
    <div>
      {/* Payment modal */}
      {payingBatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>Join {payingBatch.name}</div>
              <button onClick={() => { setPayingBatch(null); setAmountInput(''); setPayError('') }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 21, cursor: 'pointer' }}>✕</button>
            </div>
{(() => {
  const cfg = BATCH_CATEGORY_CONFIG[payingBatch.category] || {
    min: Number(payingBatch.minContribution || payingBatch.contributionPerMember || 10),
    max: Number(payingBatch.maxContribution || payingBatch.targetAmount || payingBatch.targetCapital || 50),
    color: '#00d4aa', label: ''
  }
  
  // NowPayments minimum: charge must be >= $12, so contribution must be >= $11
  // For CENT pool: if amount < $11, display shows $15 (what server will charge)
  const NP_MIN_CONTRIBUTION = 11
  const isCent = payingBatch.category === 'CENT'
  const displayAmount = rounded || cfg.min
  const actualAmount = isCent && displayAmount < NP_MIN_CONTRIBUTION ? 11 : displayAmount
  const wasAdjusted = actualAmount !== displayAmount && displayAmount > 0

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }}>
          Your Contribution (USD) — must be in tens (e.g. 10, 20, 30...)
        </label>
        <input
          type="number"
          placeholder={`$${cfg.min} – $${cfg.max}`}
          value={amountInput}
          onChange={e => setAmountInput(e.target.value)}
          style={{ width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '12px 14px', color: '#e2e8f0', fontSize: 19, fontWeight: 700, boxSizing: 'border-box' as const }}
        />
        {rounded > 0 && rounded !== parseFloat(amountInput) && (
          <div style={{ fontSize: 12, color: '#00d4aa', marginTop: 6 }}>→ Rounded to nearest $10: <strong>${rounded}</strong></div>
        )}
        {wasAdjusted && (
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
            ⚠ Minimum gateway amount: contribution adjusted to <strong>${actualAmount}</strong>
          </div>
        )}
        {actualAmount > 0 && rate && (
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>≈ ₦{(actualAmount * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</div>
        )}
      </div>

      <div style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>Pool contribution</span>
          <span style={{ color: '#e2e8f0' }}>${actualAmount || cfg.min}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>Gateway fee</span><span style={{ color: '#e2e8f0' }}>$1</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e2530', paddingTop: 6, fontWeight: 700 }}>
          <span style={{ color: '#e2e8f0' }}>Total to pay</span>
          <span style={{ color: '#c9a84c' }}>${(actualAmount || cfg.min) + 1}</span>
        </div>
        <div style={{ marginTop: 8, color: '#475569' }}>💎 Paid in <strong style={{ color: '#00d4aa' }}>USDT (TRC-20)</strong> via NowPayments</div>
      </div>

      {payError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {payError}</div>}
      <button
        onClick={initiatePayment}
        disabled={payLoading || !amountInput}
        style={{ width: '100%', background: '#00d4aa', color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 15, cursor: payLoading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: !amountInput ? 0.6 : 1 }}
      >
        {payLoading ? 'Redirecting to payment...' : `💎 Pay $${(actualAmount || cfg.min) + 1} in USDT (incl. $1 fee) →`}
      </button>
    </>
  )
})()}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {batches.map((b: any) => {
          const isMyBatch = myBatch?.id === b.id
          const cfg = BATCH_CATEGORY_CONFIG[b.category]
          const color = cfg?.color || '#818cf8'
          const target = Number(b.targetAmount || b.targetCapital || 0)
          const current = Number(b.currentAmount || 0)
          const progress = target ? (current / target) * 100 : ((b._count?.members || 0) / (b.targetMembers || 1)) * 100
          const isFull = b.status === 'FULL' || current >= target
          const canJoin = ['FORMING', 'FULL'].includes(b.status) && !isMyBatch && !isFull
          return (
            <div key={b.id} style={{ ...s.card, border: isMyBatch ? '1px solid rgba(0,212,170,0.3)' : '1px solid #1e2530' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{b.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{b.batchCode}</span>
                    <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : b.status === 'FULL' ? '#f59e0b' : '#64748b')}>{b.status}</span>
                    {b.category && <span style={s.tag(color)}>{cfg?.label || b.category}</span>}
                    {isMyBatch && <span style={s.tag('#c9a84c')}>MY BATCH</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {cfg
                    ? `$${cfg.min}–$${cfg.max} contribution`
                    : `$${Number(b.minContribution || b.contributionPerMember || 0).toLocaleString()}–$${Number(b.maxContribution || b.targetAmount || b.targetCapital || 0).toLocaleString()} contribution`
                  }
                    {b.brokerName && ` · ${b.brokerName}`}
                  </div>
                  {/* Pool progress */}
                  {target > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Pool filled</span>
                        <span style={{ color }}>${current.toLocaleString()} / ${target.toLocaleString()}</span>
                      </div>
                      <div style={{ background: '#080a0f', borderRadius: 6, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${Math.min(100, progress)}%`, borderRadius: 6 }} />
                      </div>
                    </div>
                  )}
                  {/* Trading details if active */}
                  {b.status === 'ACTIVE' && b.tradingAccountId && isMyBatch && (
                    <div style={{ marginTop: 10, background: '#080a0f', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                      <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 6 }}>📊 Trading Access</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <div><span style={{ color: '#64748b' }}>Platform: </span>{b.tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'}</div>
                        <div><span style={{ color: '#64748b' }}>Broker: </span>{b.brokerName}</div>
                        <div><span style={{ color: '#64748b' }}>Account: </span><span style={{ color: '#00d4aa', fontFamily: 'monospace' }}>{b.tradingAccountId}</span></div>
                        <div><span style={{ color: '#64748b' }}>Password: </span><span style={{ fontFamily: 'monospace' }}>{b.investorPassword}</span></div>
                        <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Server: </span>{b.tradingServer}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                  {canJoin && (
                    <button style={s.btn()} onClick={() => { setPayingBatch(b); setAmountInput(''); setPayError('') }}>
                      Join & Pay →
                    </button>
                  )}
                  {isFull && !isMyBatch && <span style={s.tag('#64748b')}>FULL</span>}
                </div>
              </div>
            </div>
          )
        })}
        {!batches.length && <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 60 }}>No batches available yet</div>}
      </div>
    </div>
  )
}

// ── WITHDRAWALS ───────────────────────────────────────────
function WithdrawalsSection({ withdrawal, myBatch, user, token, s, reload }: any) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const rate = useUsdNgnRate()

  // Dual 2FA gate: step 1 = TOTP (if enabled), step 2 = email OTP always
  const hasTwoFa = !!user?.twoFaEnabled
  const [dualStep, setDualStep] = useState<'totp'|'email_otp'>('totp')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  useEffect(() => {
    if (otpCountdown <= 0) return
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCountdown])

  // If no 2FA, start directly at email OTP
  const currentStep = hasTwoFa ? dualStep : 'email_otp'

  async function requestEmailCode() {
    setOtpLoading(true); setOtpError('')
    try {
      const r = await fetch('/api/auth/security-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: 'WITHDRAWAL' }),
      })
      const d = await r.json()
      if (!r.ok) { setOtpError(d.error || 'Failed to send code'); return }
      setOtpSent(true); setOtpCountdown(60)
    } finally { setOtpLoading(false) }
  }

  // Auto-send email OTP when reaching email step
  useEffect(() => {
    if (currentStep === 'email_otp' && !otpSent) requestEmailCode()
  }, [currentStep])

  async function submitWithdrawal() {
    if (!user?.walletAddress) { setError('Please set your USDT wallet address in Settings first.'); return }
    if (!otpCode || otpCode.length !== 6) { setOtpError('Enter the 6-digit code'); return }
    setOtpLoading(true); setOtpError('')
    try {
      if (currentStep === 'totp') {
        // Step 1: verify TOTP
        const r = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ investorId: user?.id, token: otpCode }),
        })
        const d = await r.json()
        if (!r.ok) { setOtpError(d.error || 'Invalid authenticator code'); return }
        // Move to email OTP step (email auto-sent by server in verify route... but we use separate for withdrawal)
        setDualStep('email_otp'); setOtpCode(''); setOtpSent(false)
        return
      }
      // Step 2 (or only step if no 2FA): email OTP → confirm withdrawal
      const r = await fetch('/api/withdrawals/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId: withdrawal?.id, code: otpCode }),
      })
      const d = await r.json()
      if (!r.ok) { setOtpError(d.error || 'Failed to submit'); return }
      setSubmitted(true); reload()
    } finally { setOtpLoading(false) }
  }

  if (!withdrawal?.active) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 8 }}>Withdrawals Locked</div>
      <div style={{ color: '#64748b', fontSize: 16 }}>Admin will notify you when a withdrawal window opens for your batch.</div>
    </div>
  )

  // Payment done by admin — final state
  if (withdrawal?.paymentDone) return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, border: '1px solid rgba(0,212,170,0.3)', textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#00d4aa', marginBottom: 8 }}>Payment Sent!</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#c9a84c', marginBottom: 4 }}>${parseFloat(withdrawal.amount || 0).toLocaleString()}</div>
        <NgnEquiv usd={parseFloat(withdrawal.amount || 0)} rate={rate} />
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 12, marginBottom: 20 }}>USDT has been sent to your wallet. Please check your wallet balance.</div>
        {user?.walletAddress && (
          <div style={{ background: '#080a0f', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: '#00d4aa', wordBreak: 'break-all' as const }}>
            {user.walletAddress}
          </div>
        )}
      </div>
    </div>
  )

  // Already submitted — show pending/progress
  if (submitted || withdrawal?.status === 'CONFIRMED') {
    const totalMembers = withdrawal?.totalMembers || 1
    const confirmedCount = withdrawal?.confirmedCount || 0
    const progress = Math.round((confirmedCount / totalMembers) * 100)
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ ...s.card, border: '1px solid rgba(201,168,76,0.3)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>Withdrawal Pending — Admin Processing</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#c9a84c', marginBottom: 4 }}>${parseFloat(withdrawal?.amount || 0).toLocaleString()}</div>
          <NgnEquiv usd={parseFloat(withdrawal?.amount || 0)} rate={rate} />
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, marginBottom: 16 }}>Your withdrawal for {withdrawal?.batchCode}</div>
          {/* Progress */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>Batch withdrawal progress</span>
              <span style={{ color: '#00d4aa' }}>{confirmedCount}/{totalMembers} confirmed</span>
            </div>
            <div style={{ background: '#080a0f', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#f59e0b,#c9a84c)', width: `${progress}%`, borderRadius: 6, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Payment will be processed once all members confirm or window closes</div>
          </div>
        </div>
        <div style={{ ...s.card, border: '1px solid #1e2530' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Sending to wallet:</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#00d4aa', wordBreak: 'break-all' as const }}>{user?.walletAddress || '—'}</div>
        </div>
      </div>
    )
  }

  // Ready to submit
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, border: '1px solid rgba(0,212,170,0.3)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#00d4aa', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' as const }}>Withdrawal Open</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#c9a84c', marginBottom: 2 }}>${parseFloat(withdrawal.amount || 0).toLocaleString()}</div>
        <NgnEquiv usd={parseFloat(withdrawal.amount || 0)} rate={rate} />
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Your profit share for {withdrawal.batchCode}</div>
      </div>

      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>💎 Sending to Solana Address</div>
        {user?.walletAddress ? (
          <div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#00d4aa', wordBreak: 'break-all' as const, background: '#080a0f', padding: '10px 12px', borderRadius: 8 }}>{user.walletAddress}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>⚠ Ensure this is your correct Solana address. Funds sent to wrong address cannot be recovered.</div>
          </div>
        ) : (
          <div style={{ color: '#ef4444', fontSize: 13 }}>⚠ No wallet address set. Please go to <strong>Settings</strong> and add your Solana wallet address first.</div>
        )}
      </div>

      {/* ── Security Verification Gate ── */}
      <div style={{ ...s.card, border: '1px solid rgba(201,168,76,0.2)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 17 }}>🔐</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Security Verification Required</span>
        </div>

        {/* Step indicator */}
        {hasTwoFa && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['TOTP', 'Email OTP'].map((label, i) => {
              const isActive = (i === 0 && currentStep === 'totp') || (i === 1 && currentStep === 'email_otp')
              const isDone = i === 0 && currentStep === 'email_otp'
              return (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: isDone ? 'rgba(0,212,170,0.1)' : isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', color: isDone ? '#00d4aa' : isActive ? '#c9a84c' : '#475569', border: `1px solid ${isDone ? 'rgba(0,212,170,0.3)' : isActive ? 'rgba(201,168,76,0.3)' : '#1e2530'}` }}>
                  {isDone ? '✓ ' : `${i+1}. `}{label}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          {currentStep === 'totp'
            ? '🔐 Step 1: Enter code from Google Authenticator'
            : `📧 ${hasTwoFa ? 'Step 2: ' : ''}Enter the 6-digit code sent to your email`}
        </div>
        <input
          type="text" inputMode="numeric" maxLength={6} placeholder="000000"
          value={otpCode}
          onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError('') }}
          style={{ width: '100%', background: '#080a0f', border: '1px solid rgba(0,212,170,0.4)', borderRadius: 8, padding: '12px 14px', color: '#00d4aa', fontSize: 22, fontWeight: 800, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 8 }}
        />
        {otpError && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>⚠ {otpError}</div>}
        {currentStep === 'email_otp' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setOtpSent(false); requestEmailCode() }}
              disabled={otpCountdown > 0}
              style={{ background: 'none', border: 'none', color: otpCountdown > 0 ? '#334155' : '#64748b', fontSize: 12, cursor: otpCountdown > 0 ? 'default' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
              {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend email code'}
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>⚠ {error}</div>}

      <button
        onClick={submitWithdrawal}
        disabled={otpLoading || !user?.walletAddress || otpCode.length !== 6}
        style={{ ...s.btn(), width: '100%', padding: '14px', fontSize: 15, opacity: (otpCode.length !== 6 || !user?.walletAddress) ? 0.4 : 1 }}
      >
        {otpLoading ? 'Verifying...' : currentStep === 'totp' ? '🔐 Verify Authenticator →' : '🔐 Confirm Withdrawal →'}
      </button>
    </div>
  )
}

// ── REFERRAL ──────────────────────────────────────────────
const REFERRAL_CATEGORIES = [
  { key: 'CENT',         label: '$100 Pool',    target: 100,   min: 10,   max: 50,   color: '#00d4aa', icon: '💎', desc: 'Entry-level pool for new investors' },
  { key: 'STANDARD_1K', label: '$1,000 Pool',  target: 1000,  min: 100,  max: 500,  color: '#818cf8', icon: '⭐', desc: 'Standard pool for growing portfolios' },
  { key: 'STANDARD_5K', label: '$5,000 Pool',  target: 5000,  min: 1000, max: 2500, color: '#f59e0b', icon: '🏆', desc: 'Advanced pool for serious investors' },
  { key: 'STANDARD_10K',label: '$10,000 Pool', target: 10000, min: 2500, max: 5000, color: '#c9a84c', icon: '👑', desc: 'Premium pool — maximum potential' },
]

type ReferralStep = 'list' | 'terms' | 'select-category' | 'created' | 'view-pool'

function ReferralSection({ token, user, s }: any) {
  const [pools, setPools] = useState<any[]>([])
  const [joinedPools, setJoinedPools] = useState<any[]>([])
  const [rebatePending, setRebatePending] = useState(0)
  const [rebateCredited, setRebateCredited] = useState(0)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<ReferralStep>('list')
  const [selectedPool, setSelectedPool] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newPoolData, setNewPoolData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [poolRes, rebateRes] = await Promise.all([
        fetch('/api/referrals/my', { headers }),
        fetch('/api/referrals/rebates', { headers }),
      ])
      if (poolRes.ok) { const d = await poolRes.json(); setPools(d.data?.pools || []); setJoinedPools(d.data?.joinedPools || []) }
      if (rebateRes.ok) { const d = await rebateRes.json(); setRebatePending(d.data?.totalPending || 0); setRebateCredited(d.data?.totalCredited || 0) }
    } finally { setLoading(false) }
  }

  async function createPool(category: string) {
    setCreateError(''); setCreating(true)
    try {
      const r = await fetch('/api/referrals/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category }),
      })
      const d = await r.json()
      if (!r.ok) { setCreateError(d.error || 'Failed to create pool'); return }
      setNewPoolData(d.data); setStep('created'); loadData()
    } finally { setCreating(false) }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading referral data...</div>

  // TERMS
  if (step === 'terms') return (
    <div style={{ maxWidth: 600 }}>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>📋 Referral Pool Terms & Conditions</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Read carefully before proceeding</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 28 }}>
          {[
            ['One Pool Per Category', 'You may only have one active referral pool per category at a time.'],
            ['10% Monthly Rebate Bonus', "As pool creator, you earn 10% of your pool's monthly trading account rebate, credited by admin each month."],
            ['Member Contributions', 'Referred members must complete KYC, choose a contribution within the allowed range, and pay via Flutterwave to confirm their slot.'],
            ['Pool Activation', 'Once the pool reaches its target, admin reviews and activates it with MT4/MT5 trading credentials sent to all members.'],
            ['Non-Refundable After Activation', 'Contributions are non-refundable once a pool is activated. Funds returned within 7 business days if cancelled before activation.'],
            ['Profit Distributions', "Monthly profits are distributed based on each member's contribution percentage of the pool."],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#080a0f', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{title}</div>
              <div>{text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={s.btn()} onClick={() => setStep('select-category')}>✓ Accept & Continue →</button>
          <button style={s.btn('ghost')} onClick={() => setStep('list')}>Cancel</button>
        </div>
      </div>
    </div>
  )

  // SELECT CATEGORY
  if (step === 'select-category') return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setStep('terms')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Back</button>
        <div style={{ fontWeight: 700, fontSize: 17 }}>Choose Pool Category</div>
      </div>
      {createError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>⚠ {createError}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {REFERRAL_CATEGORIES.map(cat => {
          const hasActive = pools.some(p => p.category === cat.key && ['OPEN', 'FULL'].includes(p.status))
          return (
            <div
              key={cat.key}
              onClick={() => !hasActive && !creating && createPool(cat.key)}
              style={{ background: '#0d1117', border: `1px solid ${hasActive ? '#1e2530' : cat.color + '44'}`, borderRadius: 14, padding: 20, cursor: hasActive ? 'not-allowed' : 'pointer', opacity: hasActive ? 0.5 : 1, transition: 'border-color 0.15s' }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{cat.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: cat.color, marginBottom: 4 }}>{cat.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{cat.desc}</div>
              <div style={{ fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Pool Target</span>
                  <span style={{ color: cat.color, fontWeight: 700 }}>${cat.target.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Contribution Range</span>
                  <span>${cat.min}–${cat.max}</span>
                </div>
              </div>
              {hasActive && <div style={{ marginTop: 10, fontSize: 11, color: '#f59e0b' }}>⚠ You already have an active pool in this category</div>}
              {creating && <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>Creating...</div>}
            </div>
          )
        })}
      </div>
    </div>
  )

  // CREATED
  if (step === 'created' && newPoolData) {
    const refUrl = `${APP_URL}/${newPoolData.referralCode}`
    const cat = REFERRAL_CATEGORIES.find(c => c.key === newPoolData.pool?.category) || REFERRAL_CATEGORIES[0]
    return (
      <div style={{ maxWidth: 540 }}>
        <div style={{ ...s.card, border: `1px solid ${cat.color}44`, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: cat.color }}>Referral Pool Created!</div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Share your link to invite members to your {cat.label}</div>
          <div style={{ background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }}>Your Referral Link</div>
            <div style={{ fontSize: 16, color: '#00d4aa', wordBreak: 'break-all', fontWeight: 600, marginBottom: 12 }}>{refUrl}</div>
            <button
              onClick={() => copyLink(refUrl)}
              style={{ background: copied ? 'rgba(0,212,170,0.15)' : 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '8px 20px', color: '#00d4aa', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
        <button style={s.btn()} onClick={() => { setStep('list'); setNewPoolData(null) }}>View My Pools →</button>
      </div>
    )
  }

  // VIEW SINGLE POOL
  if (step === 'view-pool' && selectedPool) {
    const cat = REFERRAL_CATEGORIES.find(c => c.key === selectedPool.category) || REFERRAL_CATEGORIES[0]
    const refUrl = `${APP_URL}/${selectedPool.referralCode}`
    const paidMembers = selectedPool.members?.filter((m: any) => ['PAID', 'ACTIVE'].includes(m.status)) || []
    const totalPaid = paidMembers.reduce((sum: number, m: any) => sum + Number(m.contribution), 0)
    const progress = (totalPaid / Number(selectedPool.targetAmount)) * 100
    const batch = selectedPool.batch
    return (
      <div style={{ maxWidth: 620 }}>
        <button onClick={() => { setStep('list'); setSelectedPool(null) }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', marginBottom: 16 }}>← Back to Pools</button>
        <div style={{ ...s.card, border: `1px solid ${cat.color}44`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>{cat.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: cat.color }}>{cat.label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Code: {selectedPool.referralCode}</div>
            </div>
            <span style={s.tag(cat.color)}>{selectedPool.status}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <span>Pool Progress</span>
              <span style={{ color: cat.color }}>${totalPaid.toLocaleString()} / ${Number(selectedPool.targetAmount).toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: '#1e2530', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: cat.color, borderRadius: 4 }} />
            </div>
          </div>
          {selectedPool.status === 'OPEN' && (
            <div style={{ background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }}>Referral Link</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: '#00d4aa', flex: 1, wordBreak: 'break-all' }}>{refUrl}</div>
                <button onClick={() => copyLink(refUrl)} style={{ background: 'none', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 6, padding: '6px 14px', color: '#00d4aa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trading details if activated */}
        {batch?.status === 'ACTIVE' && (
          <div style={{ ...s.card, border: '1px solid rgba(0,212,170,0.3)', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#00d4aa', marginBottom: 14 }}>📊 Trading Account Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              {[
                ['Platform', batch.tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'],
                ['Broker', batch.brokerName],
                ['Account ID', batch.tradingAccountId],
                ['Investor Password', batch.investorPassword],
                ['Server', batch.tradingServer],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ background: '#080a0f', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {/* Members */}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Members ({paidMembers.length})</div>
          {paidMembers.length === 0
            ? <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>No paid members yet. Share your link!</div>
            : paidMembers.map((m: any, i: number) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080a0f', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#64748b', marginRight: 8 }}>#{i + 1}</span>
                  {m.investor?.fullName}
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{m.investor?.email}</span>
                </div>
                <span style={{ color: cat.color, fontWeight: 700 }}>${Number(m.contribution).toLocaleString()}</span>
              </div>
            ))
          }
        </div>

        {/* Rebate history */}
        {selectedPool.rebates?.length > 0 && (
          <div style={s.card}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>💰 Rebate History (Your 10% Bonus)</div>
            {selectedPool.rebates.map((r: any) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e2530' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(r.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Pool rebate: ${Number(r.totalRebate).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#c9a84c' }}>${Number(r.creatorBonus).toLocaleString()}</div>
                  <span style={{ fontSize: 11, color: r.status === 'CREDITED' ? '#00d4aa' : '#f59e0b' }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // MAIN LIST VIEW
  return (
    <div>
      {(rebatePending > 0 || rebateCredited > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Pending Rebate Bonus', value: `$${rebatePending.toLocaleString()}`, color: '#f59e0b' },
            { label: 'Total Rebate Earned', value: `$${rebateCredited.toLocaleString()}`, color: '#00d4aa' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>{pools.length} referral pool{pools.length !== 1 ? 's' : ''}</div>
        <button style={s.btn()} onClick={() => setStep('terms')}>+ Create Referral Pool</button>
      </div>

      {/* Pools I created */}
      {pools.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>My Pools (Creator)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pools.map(pool => {
              const cat = REFERRAL_CATEGORIES.find(c => c.key === pool.category) || REFERRAL_CATEGORIES[0]
              const paidMembers = pool.members?.filter((m: any) => ['PAID', 'ACTIVE'].includes(m.status)) || []
              const totalPaid = paidMembers.reduce((sum: number, m: any) => sum + Number(m.contribution), 0)
              const progress = (totalPaid / Number(pool.targetAmount)) * 100
              const refUrl = `${APP_URL}/${pool.referralCode}`
              return (
                <div key={pool.id} style={{ background: '#0d1117', border: `1px solid ${cat.color}33`, borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: cat.color }}>{cat.label}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>/{pool.referralCode}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={s.tag(cat.color)}>{pool.status}</span>
                      <button
                        onClick={() => { setSelectedPool(pool); setStep('view-pool') }}
                        style={{ background: 'none', border: '1px solid #1e2530', borderRadius: 8, padding: '5px 14px', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                      >View →</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      <span>{paidMembers.length} member{paidMembers.length !== 1 ? 's' : ''}</span>
                      <span>${totalPaid.toLocaleString()} / ${Number(pool.targetAmount).toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: '#1e2530', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: cat.color, borderRadius: 3 }} />
                    </div>
                  </div>
                  {pool.status === 'OPEN' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#080a0f', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                      <span style={{ color: '#64748b', flexShrink: 0 }}>Link:</span>
                      <span style={{ color: '#00d4aa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refUrl}</span>
                      <button onClick={() => copyLink(refUrl)} style={{ background: 'none', border: 'none', color: copied ? '#00d4aa' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pools I joined as member */}
      {joinedPools.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Pools I've Joined (Member)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {joinedPools.map(jm => {
              const pool = jm.referralPool
              const cat = REFERRAL_CATEGORIES.find(c => c.key === pool?.category) || REFERRAL_CATEGORIES[0]
              const batch = pool?.batch
              const isPaid = ['PAID', 'ACTIVE'].includes(jm.status)
              return (
                <div key={jm.id} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: cat.color }}>{cat.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>By {pool?.creator?.fullName} · <strong style={{ color: '#c9a84c' }}>${Number(jm.contribution).toLocaleString()}</strong></div>
                      </div>
                    </div>
                    <span style={{ background: isPaid ? 'rgba(0,212,170,0.15)' : 'rgba(245,158,11,0.15)', color: isPaid ? '#00d4aa' : '#f59e0b', border: `1px solid ${isPaid ? 'rgba(0,212,170,0.3)' : 'rgba(245,158,11,0.3)'}`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{jm.status}</span>
                  </div>
                  {jm.status === 'PENDING_PAYMENT' && <ReferralPayButton token={token} referralMemberId={jm.id} amount={Number(jm.contribution)} color={cat.color} category={pool?.category} />}
                  {batch?.status === 'ACTIVE' && isPaid && (
                    <div style={{ background: '#080a0f', borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700, marginBottom: 8 }}>📊 Trading Access</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                        <div><span style={{ color: '#64748b' }}>Platform: </span>{batch.tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'}</div>
                        <div><span style={{ color: '#64748b' }}>Broker: </span>{batch.brokerName}</div>
                        <div><span style={{ color: '#64748b' }}>Account: </span><span style={{ color: '#00d4aa', fontFamily: 'monospace' }}>{batch.tradingAccountId}</span></div>
                        <div><span style={{ color: '#64748b' }}>Password: </span><span style={{ fontFamily: 'monospace' }}>{batch.investorPassword}</span></div>
                        <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Server: </span>{batch.tradingServer}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pools.length === 0 && joinedPools.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 8 }}>No Referral Pools Yet</div>
          <div style={{ color: '#64748b', fontSize: 16, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            Create a referral pool, share your link, and earn 10% monthly rebate bonus when your pool trades.
          </div>
          <button style={s.btn()} onClick={() => setStep('terms')}>+ Create Your First Pool</button>
        </div>
      )}
    </div>
  )
}

function ReferralPayButton({ token, referralMemberId, amount, color }: any) {
  const NP_MIN_CONTRIBUTION = 11
  const isCent = category === 'CENT'
  const actualAmount = isCent && amount < NP_MIN_CONTRIBUTION ? 11 : amount
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function pay() {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'referral', referralMemberId }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Failed'); return }
      window.location.href = d.data.paymentLink
    } finally { setLoading(false) }
  }
  return (
    <div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>⚠ {error}</div>}
      <button
        onClick={pay}
        disabled={loading}
        style={{ background: `linear-gradient(135deg,${color},${color}aa)`, color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
      >
        {loading ? 'Redirecting...' : `💎 Pay $${(actualAmount + 1).toLocaleString()} in USDT (incl. $1 fee) →`}
      </button>
    </div>
  )
}

// ── SETTINGS ──────────────────────────────────────────────
// Dual 2FA for settings: if 2FA enabled → TOTP first, then email OTP; else just email OTP
type SettingsStep = 'locked' | 'verify' | 'unlocked'

function SettingsSection({ user, token, s, setUser }: any) {
  const hasTwoFa = !!user?.twoFaEnabled
  const [step, setStep] = useState<SettingsStep>('locked')
  const [dualStep, setDualStep] = useState<'totp' | 'email_otp'>(hasTwoFa ? 'totp' : 'email_otp')
  const [codeInput, setCodeInput] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', walletAddress: user?.walletAddress || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendEmailCode() {
    setCodeLoading(true); setCodeError('')
    try {
      const r = await fetch('/api/auth/security-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: 'SETTINGS' }),
      })
      const d = await r.json()
      if (!r.ok) return setCodeError(d.error || 'Failed to send code')
      setCodeSent(true)
      setCountdown(60)
    } finally { setCodeLoading(false) }
  }

  // Keep old name as alias for resend button
  const sendCode = sendEmailCode

  async function verifyCode() {
    if (codeInput.length < 6) return setCodeError('Enter the 6-digit code')
    setVerifyLoading(true); setCodeError('')
    try {
      if (dualStep === 'totp') {
        // Step 1: verify TOTP
        const r = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ investorId: user?.id, token: codeInput }),
        })
        const d = await r.json()
        if (!r.ok) return setCodeError(d.error || 'Invalid authenticator code')
        // Move to email OTP step, auto-send code
        setDualStep('email_otp'); setCodeInput(''); setCodeSent(false)
        sendEmailCode()
      } else {
        // Step 2 (or only step): verify email OTP
        const r = await fetch('/api/auth/security-code/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: codeInput, purpose: 'SETTINGS' }),
        })
        const d = await r.json()
        if (!r.ok) return setCodeError(d.error || 'Invalid code')
        setStep('unlocked')
      }
    } finally { setVerifyLoading(false) }
  }

  async function save() {
    setSaveError(''); setSaving(true)
    try {
      const r = await fetch('/api/investors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setSaveError(d.error)
      const updated = { ...user, ...form }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      setMessage('Settings saved successfully')
      setTimeout(() => { setStep('locked'); setCodeInput(''); setCodeSent(false) }, 3000)
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

  if (step === 'locked') return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>Settings Locked</div>
        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
          Verify your identity to edit account settings.
        </div>
        <button
          onClick={() => {
            setCodeInput(''); setCodeError('')
            setDualStep(hasTwoFa ? 'totp' : 'email_otp')
            setStep('verify')
            if (!hasTwoFa) sendEmailCode()
          }}
          style={{ ...s.btn(), padding: '12px 32px', fontSize: 16 }}
        >
          {hasTwoFa ? '🔐 Verify Identity (TOTP + Email)' : '✉ Send Verification Code'}
        </button>
      </div>
      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Account Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'Full Name', value: user?.fullName },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone || '—' },
            { label: 'Wallet (Solana)', value: user?.walletAddress ? user.walletAddress.slice(0, 12) + '...' + user.walletAddress.slice(-6) : '—' },
            { label: 'KYC Status', value: user?.kycStatus },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '10px 0', borderBottom: '1px solid #1e2530', gap: 12 }}>
              <span style={{ color: '#64748b', flexShrink: 0 }}>{item.label}</span>
              <span style={{ color: item.label === 'KYC Status' ? '#00d4aa' : '#e2e8f0', textAlign: 'right', wordBreak: 'break-all' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'verify') return (
    <div style={{ maxWidth: 440 }}>
      <div style={s.card}>
        {/* Dual step indicator */}
        {hasTwoFa && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['TOTP', 'Email OTP'].map((label, i) => {
              const isActive = (i === 0 && dualStep === 'totp') || (i === 1 && dualStep === 'email_otp')
              const isDone = i === 0 && dualStep === 'email_otp'
              return (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: isDone ? 'rgba(0,212,170,0.1)' : isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', color: isDone ? '#00d4aa' : isActive ? '#c9a84c' : '#475569', border: `1px solid ${isDone ? 'rgba(0,212,170,0.3)' : isActive ? 'rgba(201,168,76,0.3)' : '#1e2530'}` }}>
                  {isDone ? '✓ ' : `${i+1}. `}{label}
                </div>
              )
            })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: dualStep === 'totp' ? 'rgba(0,212,170,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${dualStep === 'totp' ? 'rgba(0,212,170,0.2)' : 'rgba(201,168,76,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 21 }}>
            {dualStep === 'totp' ? '🔐' : '✉'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {dualStep === 'totp' ? 'Step 1: Authenticator Code' : `${hasTwoFa ? 'Step 2: ' : ''}Check Your Email`}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {dualStep === 'totp'
                ? 'Enter the 6-digit code from your Google Authenticator app'
                : `Code sent to ${user?.email}`}
            </div>
          </div>
        </div>
        {codeError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>⚠ {codeError}</div>
        )}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            {dualStep === 'totp' ? 'Authenticator Code' : '6-Digit Verification Code'}
          </label>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={codeInput}
            onChange={e => { setCodeInput(e.target.value.replace(/\D/g, '')); setCodeError('') }}
            onKeyDown={e => e.key === 'Enter' && verifyCode()}
            style={{ ...inputStyle, fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 700,
              color: dualStep === 'totp' ? '#00d4aa' : '#c9a84c' }} />
        </div>
        <button onClick={verifyCode} disabled={verifyLoading || codeInput.length < 6}
          style={{ ...s.btn(), width: '100%', padding: '13px', fontSize: 16, opacity: codeInput.length < 6 ? 0.5 : 1 }}>
          {verifyLoading ? 'Verifying...' : dualStep === 'totp' ? 'Verify Authenticator →' : 'Verify & Unlock Settings'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button onClick={() => { setStep('locked'); setCodeInput(''); setCodeError(''); setDualStep(hasTwoFa ? 'totp' : 'email_otp') }}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>← Cancel</button>
          {dualStep === 'email_otp' && (
            countdown > 0
              ? <span style={{ fontSize: 12, color: '#475569' }}>Resend in {countdown}s</span>
              : <button onClick={sendEmailCode} disabled={codeLoading}
                  style={{ background: 'none', border: 'none', color: '#00d4aa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  {codeLoading ? 'Sending...' : 'Resend Code'}
                </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
        <span style={{ fontSize: 12, color: '#00d4aa', fontWeight: 600 }}>Settings Unlocked</span>
        <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>Will re-lock after saving</span>
      </div>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Edit Account Details</div>
        {saveError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {saveError}</div>}
        {message && (
          <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#00d4aa', fontSize: 13 }}>
            ✓ {message} — re-locking settings...
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} /></div>
          <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          <div style={{ borderTop: '1px solid #1e2530', paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>💎</span>
              <span style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600 }}>Withdrawal Wallet — USDT (TRC-20)</span>
            </div>

            {/* Warning */}
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#ef4444' }}>
              ⚠ <strong>Enter your Solana (SOL) address only.</strong> Sending to a wrong address or wrong network will result in permanent loss of funds. Double-check before saving.
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>USDT Wallet Address (TRC-20 Network)</label>
              <input
                style={inputStyle}
                value={form.walletAddress}
                onChange={e => setForm(p => ({ ...p, walletAddress: e.target.value.trim() }))}
                placeholder="TRC-20 USDT address (starts with a letter/number)"
              />
            </div>

            {/* Spenda Guide */}
            <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 10, padding: 16, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 17 }}>💡</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#00d4aa' }}>Don't have a USDT wallet?</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>
                We recommend <strong style={{ color: '#e2e8f0' }}>Spenda</strong> — it receives USDT and instantly converts to Naira in your local bank account. Perfect for Nigerian investors.
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: 6 }}>How to get started with Spenda:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    '1. Download Spenda app (iOS or Android)',
                    '2. Sign up and complete verification',
                    '3. Use referral code below to get started',
                    '4. Go to Wallet → Receive → Select USDT (TRC-20)',
                    '5. Copy your TRC-20 address and paste it above',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#00d4aa', flexShrink: 0 }}>→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#080a0f', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 2, marginBottom: 2 }}>SPENDA REFERRAL CODE</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 19, color: '#c9a84c', letterSpacing: 3 }}>18Z5VITD</div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText('18Z5VITD')}
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '6px 12px', color: '#c9a84c', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >Copy</button>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <a href="https://apps.apple.com/app/spenda" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 6, padding: '8px', color: '#e2e8f0', fontSize: 11, textDecoration: 'none', display: 'block' }}>🍎 App Store</a>
                <a href="https://play.google.com/store/apps/details?id=com.spenda" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 6, padding: '8px', color: '#e2e8f0', fontSize: 11, textDecoration: 'none', display: 'block' }}>🤖 Google Play</a>
              </div>
            </div>
          </div>
          <button style={s.btn()} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {/* ── 2FA Section ── */}
      <TwoFASection user={user} token={token} s={s} reload={() => {
        fetch('/api/investors/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (d.data) setUser(d.data) })
      }} />
    </div>
  )
}

// ── 2FA SECTION ───────────────────────────────────────────
function TwoFASection({ user, token, s, reload }: any) {
  const [mode, setMode] = useState<'idle'|'setup'|'disabling'>('idle')
  const [qrData, setQrData] = useState<any>(null)
  const [totpInput, setTotpInput] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [qrLoading, setQrLoading] = useState(false)

  const enabled = user?.twoFaEnabled

  async function startSetup() {
    setQrLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/2fa/setup', { headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (!r.ok) { setError(d.error); return }
      setQrData(d.data); setMode('setup')
    } finally { setQrLoading(false) }
  }

  async function confirmTotp() {
    if (!totpInput || totpInput.length !== 6) { setError('Enter 6-digit code from your authenticator app'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: totpInput }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error); return }
      setMessage('✓ 2FA enabled! Your account is now protected.')
      setMode('idle'); setTotpInput('')
      // Update localStorage so user object reflects new state immediately
      try { const u = JSON.parse(localStorage.getItem('user') || '{}'); u.twoFaEnabled = true; localStorage.setItem('user', JSON.stringify(u)) } catch {}
      reload?.()
    } finally { setLoading(false) }
  }

  async function sendDisableCode() {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/security-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: 'SETTINGS' }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error); return }
      setMode('disabling')
    } finally { setLoading(false) }
  }

  async function disable2FA() {
    if (!disableCode || disableCode.length !== 6) { setError('Enter the 6-digit code from your email'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/2fa/setup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: disableCode }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error); return }
      setMessage('2FA has been disabled.')
      setMode('idle'); setDisableCode('')
      // Update localStorage
      try { const u = JSON.parse(localStorage.getItem('user') || '{}'); u.twoFaEnabled = false; localStorage.setItem('user', JSON.stringify(u)) } catch {}
      reload?.()
    } finally { setLoading(false) }
  }

  const inputStyle = { background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ ...s.card, border: enabled ? '1px solid rgba(0,212,170,0.3)' : '1px solid #1e2530' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 17 }}>🔐</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Two-Factor Authentication</span>
            {enabled && <span style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: 1 }}>ACTIVE</span>}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            {enabled
              ? 'Your account is protected. 2FA is required for login (after 24h), withdrawals, and settings changes.'
              : 'Strongly recommended. Protects withdrawals, login, and settings with Google Authenticator.'}
          </div>
        </div>
      </div>

      {message && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 12, background: 'rgba(0,212,170,0.08)', padding: '8px 12px', borderRadius: 8 }}>✓ {message}</div>}
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>⚠ {error}</div>}

      {/* Idle — not yet set up */}
      {mode === 'idle' && !enabled && (
        <div>
          <div style={{ background: '#080a0f', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#94a3b8' }}>
            <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: 6 }}>How it works:</strong>
            <div>1. Download <strong style={{ color: '#00d4aa' }}>Google Authenticator</strong> (iOS / Android)</div>
            <div>2. Scan the QR code shown after clicking Enable</div>
            <div>3. Enter the 6-digit code from the app to activate</div>
            <div>4. You'll need the app for login after 24h, withdrawals & settings</div>
          </div>
          <button style={{ ...s.btn(), width: '100%' }} onClick={startSetup} disabled={qrLoading}>
            {qrLoading ? 'Loading...' : '🔐 Enable 2FA (Recommended)'}
          </button>
        </div>
      )}

      {/* Setup — show QR */}
      {mode === 'setup' && qrData && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Scan this QR code with Google Authenticator:</div>
            {/* Render QR as canvas via URI — use a free QR API */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData.uri)}&size=180x180&bgcolor=080a0f&color=00d4aa&margin=2`}
              alt="2FA QR Code"
              style={{ borderRadius: 8, border: '2px solid rgba(0,212,170,0.3)' }}
            />
          </div>
          <div style={{ background: '#080a0f', borderRadius: 8, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 2, marginBottom: 4 }}>MANUAL ENTRY KEY</div>
            <div style={{ fontFamily: 'monospace', color: '#c9a84c', fontSize: 13, letterSpacing: 2, wordBreak: 'break-all' as const }}>{qrData.secret}</div>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Enter the 6-digit code from your authenticator app:</div>
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={totpInput} onChange={e => { setTotpInput(e.target.value.replace(/\D/g,'')); setError('') }}
            style={{ ...inputStyle, fontSize: 24, fontWeight: 800, letterSpacing: 10, textAlign: 'center', color: '#c9a84c', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.btn('ghost'), flex: 1 }} onClick={() => setMode('idle')}>Cancel</button>
            <button style={{ ...s.btn(), flex: 2 }} onClick={confirmTotp} disabled={loading}>
              {loading ? 'Verifying...' : '✓ Activate 2FA'}
            </button>
          </div>
        </div>
      )}

      {/* Already enabled — show disable option */}
      {mode === 'idle' && enabled && (
        <button style={{ ...s.btn('ghost'), width: '100%', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={sendDisableCode} disabled={loading}>
          {loading ? 'Sending code...' : 'Disable 2FA'}
        </button>
      )}

      {/* Disabling — enter email OTP */}
      {mode === 'disabling' && (
        <div>
          <div style={{ fontSize: 12, color: '#00d4aa', marginBottom: 10 }}>✓ A code has been sent to your email. Enter it below to disable 2FA.</div>
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={disableCode} onChange={e => { setDisableCode(e.target.value.replace(/\D/g,'')); setError('') }}
            style={{ ...inputStyle, fontSize: 24, fontWeight: 800, letterSpacing: 10, textAlign: 'center', color: '#ef4444', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...s.btn('ghost'), flex: 1 }} onClick={() => setMode('idle')}>Cancel</button>
            <button style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flex: 2 }} onClick={disable2FA} disabled={loading}>
              {loading ? 'Disabling...' : 'Confirm Disable 2FA'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SUPPORT SECTION ───────────────────────────────────────
function SupportSection({ s }: any) {
  const contacts = [
    {
      icon: '✉',
      label: 'EMAIL',
      value: 'nova.liteltd@gmail.com',
      sub: 'Best for detailed inquiries. We respond within 24 hours.',
      href: 'mailto:nova.liteltd@gmail.com',
      color: '#c9a84c',
    },
    {
      icon: '✈',
      label: 'TELEGRAM',
      value: '@novalitesignal',
      sub: 'Join our Telegram channel for updates and announcements.',
      href: 'https://t.me/novalitesignal',
      color: '#2AABEE',
    },
    {
      icon: '☎',
      label: 'PHONE / WHATSAPP',
      value: '+234 703 092 3585',
      value2: '+234 814 424 1060',
      sub: null,
      href: 'https://wa.me/2347030923585',
      href2: 'https://wa.me/2348144241060',
      color: '#25D366',
    },
  ]

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: 21, color: '#e2e8f0' }}>Contact Support</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, maxWidth: 520 }}>
          Our support team is available to assist you with account questions, KYC issues, withdrawal inquiries, and general platform guidance.
        </p>
      </div>

      {/* Contact cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {contacts.map(c => (
          <div key={c.label} style={{ ...s.card, display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', border: `1px solid rgba(${c.color === '#c9a84c' ? '201,168,76' : c.color === '#2AABEE' ? '42,171,238' : '37,211,102'},0.15)` }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(${c.color === '#c9a84c' ? '201,168,76' : c.color === '#2AABEE' ? '42,171,238' : '37,211,102'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: '#64748b', fontFamily: 'monospace', marginBottom: 4 }}>{c.label}</div>
              <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: c.color, textDecoration: 'none', display: 'block', marginBottom: c.value2 ? 4 : 0 }}>
                {c.value}
              </a>
              {c.value2 && c.href2 && (
                <a href={c.href2} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: c.color, textDecoration: 'none', display: 'block', marginBottom: 0 }}>
                  {c.value2}
                </a>
              )}
              {c.sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Hours banner */}
      <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 19, flexShrink: 0 }}>🕐</span>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <strong style={{ color: '#c9a84c' }}>Support hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM (WAT).<br />
          We aim to respond to all inquiries within one business day.
        </div>
      </div>
    </div>
  )
}

// ── BROADCAST BANNER ──────────────────────────────────────
const BROADCAST_COLORS: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  INFO:    { bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)', icon: 'ℹ️', label: 'Notice' },
  SUCCESS: { bg: 'rgba(0,212,170,0.08)',   border: 'rgba(0,212,170,0.25)',   icon: '✅', label: 'Update' },
  WARNING: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  icon: '⚠️', label: 'Alert' },
  URGENT:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)',    icon: '🚨', label: 'Urgent' },
}

function BroadcastBanner({ broadcasts }: { broadcasts: any[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = broadcasts.filter(b => !dismissed.has(b.id))
  if (!visible.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {visible.map(b => {
        const cfg = BROADCAST_COLORS[b.type] || BROADCAST_COLORS.INFO
        return (
          <div key={b.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontSize: 21, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  FROM NOVA-LITE · {cfg.label.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{b.message}</div>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(b.id)))}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 17, flexShrink: 0, padding: 4, lineHeight: 1 }}
              title="Dismiss"
            >✕</button>
          </div>
        )
      })}
    </div>
  )
}

// ── NOTIFICATIONS SECTION ─────────────────────────────────
function NotificationsSection({ token, user, s }: any) {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ whatsappNumber: '', callmebotApiKey: '', notifyKyc: true, notifyBatch: true, notifyWithdrawal: true })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    fetch('/api/investor-notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setSettings(d.data)
          setForm({ whatsappNumber: d.data.whatsappNumber || '', callmebotApiKey: d.data.callmebotApiKey || '', notifyKyc: d.data.notifyKyc, notifyBatch: d.data.notifyBatch, notifyWithdrawal: d.data.notifyWithdrawal })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setMessage('')
    try {
      const r = await fetch('/api/investor-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { setMsgType('error'); setMessage(d.error || 'Failed to save'); return }
      setMsgType(d.data.verified ? 'success' : 'error')
      setMessage(d.data.message)
      setSettings((prev: any) => ({ ...prev, ...form, isVerified: d.data.verified }))
    } finally { setSaving(false) }
  }

  async function disable() {
    setSaving(true)
    await fetch('/api/investor-notifications', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setSettings((prev: any) => ({ ...prev, isVerified: false }))
    setMessage('Notifications disabled.')
    setMsgType('success')
    setSaving(false)
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'monospace' }
  const labelStyle: any = { fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }
  const toggle = (key: string) => setForm(p => ({ ...p, [key]: !(p as any)[key] }))

  if (loading) return <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Status card */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: settings?.isVerified ? 'rgba(0,212,170,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${settings?.isVerified ? 'rgba(0,212,170,0.3)' : '#1e2530'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>
          {settings?.isVerified ? '🟢' : '🔕'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: settings?.isVerified ? '#00d4aa' : '#64748b' }}>
            {settings?.isVerified ? 'WhatsApp Notifications Active' : 'Notifications Not Set Up'}
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
            {settings?.isVerified
              ? `Sending to ${settings.whatsappNumber}`
              : 'Set up your CallMeBot API key to receive updates on WhatsApp'}
          </div>
        </div>
        {settings?.isVerified && (
          <button onClick={disable} disabled={saving} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            Disable
          </button>
        )}
      </div>

      {/* Setup instructions */}
      <div style={{ ...s.card, background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#c9a84c', marginBottom: 12 }}>📱 How to Get Your Free API Key</div>
        {[
          ['1', 'Save this number in WhatsApp contacts:', '+34 644 597 103'],
          ['2', 'Send this exact message to that number:', 'I allow callmebot to send me messages'],
          ['3', 'CallMeBot will reply with your API key', '(usually within 2 minutes)'],
          ['4', 'Enter your number and API key below', 'then click Save & Verify'],
        ].map(([n, text, sub]) => (
          <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#c9a84c', flexShrink: 0, marginTop: 1 }}>{n}</div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{text}</div>
              {sub && <div style={{ fontSize: 11, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Settings form */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Notification Settings</div>

        {message && (
          <div style={{ background: msgType === 'success' ? 'rgba(0,212,170,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msgType === 'success' ? 'rgba(0,212,170,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: msgType === 'success' ? '#00d4aa' : '#ef4444' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Your WhatsApp Number</label>
            <input style={inputStyle} placeholder="08012345678" value={form.whatsappNumber} onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))} />
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>Nigerian format: 08012345678 (11 digits)</div>
          </div>
          <div>
            <label style={labelStyle}>CallMeBot API Key</label>
            <input style={inputStyle} placeholder="e.g. 1234567" value={form.callmebotApiKey} onChange={e => setForm(p => ({ ...p, callmebotApiKey: e.target.value }))} />
          </div>

          <div style={{ borderTop: '1px solid #1e2530', paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: "'JetBrains Mono', monospace" }}>Notify Me When:</div>
            {[
              { key: 'notifyKyc', label: 'KYC status changes (approved / rejected)', icon: '📋' },
              { key: 'notifyBatch', label: 'My batch is activated (trading starts)', icon: '🚀' },
              { key: 'notifyWithdrawal', label: 'Withdrawal is processed', icon: '💸' },
            ].map(({ key, label, icon }) => (
              <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e2530', cursor: 'pointer' }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>{label}</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: (form as any)[key] ? '#00d4aa' : '#1e2530', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: (form as any)[key] ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={save} disabled={saving || !form.whatsappNumber || !form.callmebotApiKey}
            style={{ background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 800, fontSize: 16, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: !form.whatsappNumber || !form.callmebotApiKey ? 0.5 : 1 }}>
            {saving ? 'Saving & Verifying...' : '💾 Save & Verify via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  )
}
