'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Section = 'portfolio' | 'batches' | 'withdrawals' | 'settings'

export default function InvestorDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('portfolio')
  const [user, setUser] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [myBatch, setMyBatch] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [withdrawal, setWithdrawal] = useState<any>(null)
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
  }, [])

  async function loadData(token: string) {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [batchRes, txRes, wdRes] = await Promise.all([
        fetch('/api/batches', { headers }),
        fetch('/api/transactions/my', { headers }),
        fetch('/api/withdrawals/my', { headers }),
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
    } finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); router.push('/login') }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: 'portfolio', label: 'My Portfolio', icon: '◈' },
    { id: 'batches', label: 'Batches', icon: '⬡' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⟁' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
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
          .dash-sidebar { display: none !important; }
          .dash-mobile-nav { display: flex !important; }
          .dash-content { padding: 16px !important; }
          .dash-topbar { padding: 12px 16px !important; }
        }
        @media (min-width: 769px) {
          .dash-mobile-nav { display: none !important; }
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
        <div className="dash-sidebar" style={s.sidebar}>
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
                <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', whiteSpace: 'nowrap' }}>Club10 Pool</div>
                <div style={{ fontSize: 9, color: '#00d4aa', letterSpacing: 2, whiteSpace: 'nowrap' }}>INVESTOR</div>
              </div>
            )}
          </div>

          <div style={s.nav}>
            {navItems.map(item => (
              <div key={item.id} style={s.navItem(section === item.id)} onClick={() => setSection(item.id)}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
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
              {/* Logout SVG icon */}
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
              {/* Mobile logo */}
              <div className="dash-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.png" alt="Club10" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>Club10 Pool</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#00d4aa', fontSize: 8 }}>●</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</span>
              </div>
              {/* Mobile logout */}
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
                {section === 'batches' && <BatchesSection batches={batches} myBatch={myBatch} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'withdrawals' && <WithdrawalsSection withdrawal={withdrawal} myBatch={myBatch} user={user} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'settings' && <SettingsSection user={user} token={token!} s={s} setUser={setUser} />}
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
              onClick={() => setSection(item.id)}
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

// ── PORTFOLIO ─────────────────────────────────────────────
function PortfolioSection({ myBatch, transactions, s, setSection }: any) {
  if (!myBatch) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>⬡</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Active Batch</div>
      <div style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>You are not currently part of any investment batch.</div>
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
          { label: 'Capital Invested', value: `₦${capital.toLocaleString()}`, color: '#00d4aa' },
          { label: 'Share Percent', value: `${sharePercent.toFixed(2)}%`, color: '#c9a84c' },
          { label: 'Total Profit Earned', value: `₦${totalProfit.toLocaleString()}`, color: '#818cf8' },
          { label: 'Batch Status', value: myBatch.status, color: myBatch.status === 'ACTIVE' ? '#00d4aa' : '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
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
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Transaction History</div>
        {transactions.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead><tr>{['Type', 'Amount', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {transactions.slice(0, 10).map((tx: any) => (
                  <tr key={tx.id}>
                    <td style={s.td}><span style={{ color: tx.type === 'PROFIT_SHARE' ? '#00d4aa' : tx.type === 'DEPOSIT' ? '#818cf8' : '#94a3b8', fontSize: 12 }}>{tx.type}</span></td>
                    <td style={s.td}><span style={{ fontWeight: 600, color: '#c9a84c' }}>₦{parseFloat(tx.amount).toLocaleString()}</span></td>
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
function BatchesSection({ batches, myBatch, token, s, reload }: any) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function requestJoin(batchId: string) {
    setLoading(batchId)
    try {
      const r = await fetch(`/api/batches/${batchId}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const d = await r.json()
      if (r.ok) { setMessage('Join request sent!'); reload() }
      else setMessage(d.error || 'Failed to join')
    } finally { setLoading(null) }
  }

  return (
    <div>
      {message && <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#00d4aa', fontSize: 13 }}>{message}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {batches.map((b: any) => {
          const isMyBatch = myBatch?.id === b.id
          const isFull = (b._count?.members || 0) >= b.targetMembers
          const canJoin = b.status === 'FORMING' && !isMyBatch && !myBatch && !isFull
          return (
            <div key={b.id} style={{ ...s.card, border: isMyBatch ? '1px solid rgba(0,212,170,0.3)' : '1px solid #1e2530' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{b.batchCode}</span>
                    <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : '#64748b')}>{b.status}</span>
                    {isMyBatch && <span style={s.tag('#c9a84c')}>MY BATCH</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                    ₦{parseFloat(b.contributionPerMember).toLocaleString()} · {b._count?.members || 0}/{b.targetMembers} members
                    {b.brokerName && ` · ${b.brokerName}`}
                  </div>
                  <div style={{ background: '#080a0f', borderRadius: 6, height: 5, maxWidth: 220, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#818cf8', width: `${Math.min(100, (b._count?.members || 0) / b.targetMembers * 100)}%`, borderRadius: 6 }} />
                  </div>
                </div>
                {canJoin && (
                  <button style={{ ...s.btn(), flexShrink: 0 }} onClick={() => requestJoin(b.id)} disabled={loading === b.id}>
                    {loading === b.id ? 'Requesting...' : 'Request to Join'}
                  </button>
                )}
                {isFull && !isMyBatch && <span style={s.tag('#64748b')}>FULL</span>}
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
  const [confirmed, setConfirmed] = useState(false)

  async function confirmPayout() {
    setLoading(true)
    try {
      const r = await fetch('/api/withdrawals/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ withdrawalId: withdrawal?.id }),
      })
      if (r.ok) { setConfirmed(true); reload() }
    } finally { setLoading(false) }
  }

  if (!withdrawal?.active) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Withdrawals Locked</div>
      <div style={{ color: '#64748b', fontSize: 14 }}>Withdrawals are not currently active. Admin will notify you when profit distributions open.</div>
    </div>
  )

  if (confirmed || withdrawal?.status === 'CONFIRMED') return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#00d4aa' }}>Payout Confirmed</div>
      <div style={{ color: '#64748b', fontSize: 14 }}>Your payout request has been submitted. Admin will process the transfer to your bank account.</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, border: '1px solid rgba(0,212,170,0.3)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#00d4aa', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>Withdrawal Active</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#c9a84c', marginBottom: 4 }}>
          ₦{parseFloat(withdrawal.amount || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Your profit share for {withdrawal.batchCode}</div>
      </div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Payout To</div>
        {user?.bankName ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{user.bankName}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{user.bankAccount}</div>
          </div>
        ) : (
          <div style={{ color: '#ef4444', fontSize: 13 }}>⚠ No bank account set. Please update in Settings before confirming.</div>
        )}
      </div>
      <button onClick={confirmPayout} disabled={loading || !user?.bankName} style={{ ...s.btn(), width: '100%', padding: '14px', fontSize: 15, opacity: !user?.bankName ? 0.5 : 1 }}>
        {loading ? 'Confirming...' : 'Confirm Payout'}
      </button>
    </div>
  )
}

// ── SETTINGS ──────────────────────────────────────────────
type SettingsStep = 'locked' | 'verify' | 'unlocked'

function SettingsSection({ user, token, s, setUser }: any) {
  const [step, setStep] = useState<SettingsStep>('locked')
  const [codeInput, setCodeInput] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', bankName: user?.bankName || '', bankAccount: user?.bankAccount || '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendCode() {
    setCodeLoading(true); setCodeError('')
    try {
      const r = await fetch('/api/auth/settings-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (!r.ok) return setCodeError(d.error || 'Failed to send code')
      setCodeSent(true)
      setCountdown(60)
    } finally { setCodeLoading(false) }
  }

  async function verifyCode() {
    if (codeInput.length < 6) return setCodeError('Enter the 6-digit code')
    setVerifyLoading(true); setCodeError('')
    try {
      const r = await fetch('/api/auth/settings-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: codeInput }),
      })
      const d = await r.json()
      if (!r.ok) return setCodeError(d.error || 'Invalid code')
      setStep('unlocked')
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
      // Re-lock after saving for security
      setTimeout(() => { setStep('locked'); setCodeInput(''); setCodeSent(false) }, 3000)
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

  // ── LOCKED STATE ──
  if (step === 'locked') return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, textAlign: 'center', padding: '48px 32px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Settings Locked</div>
        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
          To protect your account, a verification code will be sent to<br />
          <span style={{ color: '#00d4aa', fontWeight: 600 }}>{user?.email}</span><br />
          before you can edit your settings.
        </div>
        <button
          onClick={() => { setStep('verify'); sendCode() }}
          style={{ ...s.btn(), padding: '12px 32px', fontSize: 14 }}
        >
          Send Verification Code
        </button>
      </div>

      {/* Read-only account info */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Account Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'Full Name', value: user?.fullName },
            { label: 'Email', value: user?.email },
            { label: 'Phone', value: user?.phone || '—' },
            { label: 'Bank Name', value: user?.bankName || '—' },
            { label: 'Account No.', value: user?.bankAccount || '—' },
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

  // ── VERIFY CODE STATE ──
  if (step === 'verify') return (
    <div style={{ maxWidth: 440 }}>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Check Your Email</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Code sent to {user?.email}</div>
          </div>
        </div>

        {codeError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
            ⚠ {codeError}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>6-Digit Verification Code</label>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verifyCode()}
            style={{ ...inputStyle, fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 700 }}
          />
        </div>

        <button
          onClick={verifyCode}
          disabled={verifyLoading || codeInput.length < 6}
          style={{ ...s.btn(), width: '100%', padding: '13px', fontSize: 14, opacity: codeInput.length < 6 ? 0.5 : 1 }}
        >
          {verifyLoading ? 'Verifying...' : 'Verify & Unlock Settings'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button
            onClick={() => { setStep('locked'); setCodeInput(''); setCodeError('') }}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Cancel
          </button>
          {countdown > 0 ? (
            <span style={{ fontSize: 12, color: '#475569' }}>Resend in {countdown}s</span>
          ) : (
            <button
              onClick={sendCode}
              disabled={codeLoading}
              style={{ background: 'none', border: 'none', color: '#00d4aa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              {codeLoading ? 'Sending...' : 'Resend Code'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── UNLOCKED STATE ──
  return (
    <div style={{ maxWidth: 520 }}>
      {/* Unlocked badge */}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600 }}>Bank Details</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Used for profit withdrawals. Ensure accuracy before saving.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelStyle}>Bank Name</label><input style={inputStyle} value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="e.g. GTBank, Access, Zenith" /></div>
              <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={form.bankAccount} onChange={e => setForm(p => ({ ...p, bankAccount: e.target.value }))} placeholder="10-digit account number" /></div>
            </div>
          </div>

          <button style={s.btn()} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}
