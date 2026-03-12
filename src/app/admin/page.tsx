//src/app/admin/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Section = 'overview' | 'batches' | 'investors' | 'kyc' | 'withdrawals' | 'referrals' | 'audit' | 'broadcast'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function getStorageUrl(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  return `${SUPABASE_URL}/storage/v1/object/public/${raw}`
}

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}
const CATEGORY_COLORS: Record<string, string> = {
  CENT: '#00d4aa', STANDARD_1K: '#818cf8',
  STANDARD_5K: '#f59e0b', STANDARD_10K: '#c9a84c',
}

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

export default function AdminDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [investors, setInvestors] = useState<any[]>([])
  const [kycList, setKycList] = useState<any[]>([])
  const [referralPools, setReferralPools] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    const parsed = JSON.parse(userData)
    if (!parsed.isAdmin) { router.push('/dashboard'); return }
    setUser(parsed)
    loadData(token)

    // Background auto-refresh every 1 minute (silent)
    const interval = setInterval(() => {
      const t = localStorage.getItem('token')
      if (!t) return
      const headers = { Authorization: `Bearer ${t}` }
      Promise.all([
        fetch('/api/dashboard', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/batches', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/investors', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/kyc/admin', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/referrals/admin', { headers }).then(r => r.ok ? r.json() : null),
      ]).then(([statsData, batchData, invData, kycData, refData]) => {
        if (statsData?.data) setStats(statsData.data)
        if (batchData?.data) setBatches(batchData.data || [])
        if (invData?.data) setInvestors(invData.data || [])
        if (kycData?.data) setKycList(kycData.data || [])
        if (refData?.data) setReferralPools(refData.data || [])
      }).catch(() => {})
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  async function loadData(token: string) {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [statsRes, batchRes, invRes, kycRes, refRes, broadcastRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/batches', { headers }),
        fetch('/api/investors', { headers }),
        fetch('/api/kyc/admin', { headers }),
        fetch('/api/referrals/admin', { headers }),
        fetch('/api/broadcast', { headers }),
      ])
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.data) }
      if (batchRes.ok) { const d = await batchRes.json(); setBatches(d.data || []) }
      if (invRes.ok) { const d = await invRes.json(); setInvestors(d.data || []) }
      if (kycRes.ok) { const d = await kycRes.json(); setKycList(d.data || []) }
      if (refRes.ok) { const d = await refRes.json(); setReferralPools(d.data || []) }
      if (broadcastRes?.ok) { const d = await broadcastRes.json(); setBroadcasts(d.data || []) }

    } finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); router.push('/login') }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const pendingKyc = kycList.filter(k => k.status === 'PENDING').length
  const fullPools = referralPools.filter(p => p.status === 'FULL').length

  const navItems: { id: Section; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'batches', label: 'Batch Management', icon: '⬡' },
    { id: 'investors', label: 'Investor Accounts', icon: '◎' },
    { id: 'kyc', label: 'KYC Approvals', icon: '⊡', badge: pendingKyc || undefined },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⟁' },
    { id: 'referrals', label: 'Referral Pools', icon: '🔗', badge: fullPools || undefined },
    { id: 'audit', label: 'Audit Logs', icon: '≡' },
    { id: 'broadcast', label: 'Broadcast', icon: '📢' },
  ]

  const s: any = {
    app: { display: 'flex', minHeight: '100vh', background: '#080a0f', color: '#e2e8f0', fontFamily: "'DM Mono', 'Courier New', monospace" },
    sidebar: { width: sidebarOpen ? 260 : 72, background: '#0d1117', borderRight: '1px solid #1e2530', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0 },
    logo: { padding: '20px 16px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' },
    nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(201,168,76,0.12)' : 'transparent', color: active ? '#c9a84c' : '#64748b', border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', fontSize: 13, fontWeight: active ? 600 : 400 }),
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
    topbar: { padding: '16px 24px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117', flexShrink: 0 },
    content: { flex: 1, padding: 24, overflowY: 'auto' },
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24 },
    statCard: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 },
    tag: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }),
    btn: (variant: 'primary' | 'danger' | 'ghost' = 'primary') => ({
      padding: '10px 20px', borderRadius: 8, cursor: 'pointer' as const, fontSize: 13, fontWeight: 600,
      background: variant === 'primary' ? '#00d4aa' : variant === 'danger' ? '#ef4444' : 'transparent',
      color: variant === 'primary' ? '#000' : variant === 'danger' ? '#fff' : '#64748b',
      border: variant === 'ghost' ? '1px solid #1e2530' : 'none',
    } as React.CSSProperties),
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 14px', color: '#64748b', borderBottom: '1px solid #1e2530', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const },
    td: { padding: '12px 14px', borderBottom: '1px solid #0f1520', verticalAlign: 'middle' as const },
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 200;
            transform: translateX(-100%);
            transition: transform 0.25s ease !important;
            width: 260px !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.5);
          }
          .admin-sidebar.open {
            transform: translateX(0) !important;
          }
          .admin-mobile-overlay {
            display: none;
            position: fixed; inset: 0; z-index: 199;
            background: rgba(0,0,0,0.6);
          }
          .admin-mobile-overlay.open { display: block; }
          .admin-content { padding: 16px !important; }
          .admin-topbar { padding: 12px 16px !important; }
          .admin-grid2 { grid-template-columns: 1fr !important; }
          .kyc-split { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .admin-mobile-overlay { display: none !important; }
        }
      `}</style>

      <div style={s.app}>
        {/* SIDEBAR */}
        <div className={`admin-mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} style={s.sidebar}>
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
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#c9a84c,#8b5e1a)', display: 'none', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#fff', flexShrink: 0 }}>C</div>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', whiteSpace: 'nowrap' }}>Club10 Pool</div>
                <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 2, whiteSpace: 'nowrap' }}>ADMIN</div>
              </div>
            )}
          </div>

          <div style={s.nav}>
            {navItems.map(item => (
              <div key={item.id} style={s.navItem(section === item.id)} onClick={() => { setSection(item.id); if (window.innerWidth < 768) setSidebarOpen(false) }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                {sidebarOpen && item.badge ? (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{item.badge}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 12px', borderTop: '1px solid #1e2530' }}>
            {sidebarOpen && (
              <div style={{ fontSize: 11, color: '#64748b', padding: '0 12px', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>
            )}
            <div style={{ ...s.navItem(false), color: '#ef4444' }} onClick={logout} title="Logout">
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
        <div style={s.main}>
          <div className="admin-topbar" style={s.topbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.png" alt="Club10" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{navItems.find(n => n.id === section)?.label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#c9a84c', fontSize: 8 }}>●</span>
                <span>{user?.fullName || 'Admin'}</span>
              </div>
              <button onClick={logout} title="Logout" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="admin-content" style={s.content}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>Loading...</div>
            ) : (
              <>
                {section === 'overview' && <OverviewSection stats={stats} batches={batches} investors={investors} kycList={kycList} referralPools={referralPools} s={s} setSection={setSection} />}
                {section === 'batches' && <BatchSection batches={batches} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'investors' && <InvestorSection investors={investors} batches={batches} s={s} />}
                {section === 'kyc' && <KYCSection kycList={kycList} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'withdrawals' && <WithdrawalSection batches={batches} token={token!} s={s} />}
                {section === 'referrals' && <ReferralAdminSection referralPools={referralPools} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'audit' && <AuditSection token={token!} s={s} />}
                {(section as any) === 'broadcast' && <BroadcastSection token={token!} broadcasts={broadcasts} s={s} reload={() => loadData(token!)} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────
function OverviewSection({ stats, batches, investors, kycList, referralPools, s, setSection }: any) {
  const pendingKyc = kycList.filter((k: any) => k.status === 'PENDING').length
  const activeBatches = batches.filter((b: any) => b.status === 'ACTIVE').length
  const fullPools = referralPools.filter((p: any) => p.status === 'FULL').length
  const totalCapital = batches.reduce((sum: number, b: any) => sum + parseFloat(b.targetCapital || 0), 0)
  const rate = useUsdNgnRate()

  return (
    <div>
      <div style={s.grid4}>
        {[
          { label: 'Total Investors', value: investors.length, usd: null, color: '#c9a84c', icon: '◎' },
          { label: 'Active Batches', value: activeBatches, usd: null, color: '#00d4aa', icon: '⬡' },
          { label: 'Total Capital', value: `$${totalCapital.toLocaleString()}`, usd: totalCapital, color: '#818cf8', icon: '◈' },
          { label: 'Pending KYC', value: pendingKyc, usd: null, color: '#f59e0b', icon: '⊡' },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ fontSize: 24, color: stat.color }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            {stat.usd !== null && <NgnEquiv usd={stat.usd as number} rate={rate} />}
            <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {pendingKyc > 0 && (
        <div style={{ ...s.card, marginBottom: 16, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⊡ {pendingKyc} KYC Approval{pendingKyc > 1 ? 's' : ''} Pending</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Investors waiting for identity verification approval</div>
            </div>
            <button style={s.btn()} onClick={() => setSection('kyc')}>Review Now</button>
          </div>
        </div>
      )}

      {fullPools > 0 && (
        <div style={{ ...s.card, marginBottom: 16, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#c9a84c', marginBottom: 4 }}>🔗 {fullPools} Referral Pool{fullPools > 1 ? 's' : ''} Ready for Activation</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Pools have reached their target — input MT4/MT5 details to activate</div>
            </div>
            <button style={{ ...s.btn(), background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000' }} onClick={() => setSection('referrals')}>Activate Now</button>
          </div>
        </div>
      )}

      <div className="admin-grid2" style={s.grid2}>
        <div style={s.card}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>Recent Batches</div>
          {batches.slice(0, 5).map((b: any) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e2530' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{b.batchCode}</div>
              </div>
              <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : '#64748b')}>{b.status}</span>
            </div>
          ))}
          {!batches.length && <div style={{ color: '#64748b', fontSize: 13 }}>No batches yet</div>}
        </div>
        <div style={s.card}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>Recent KYC</div>
          {kycList.slice(0, 5).map((k: any) => (
            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e2530' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{k.fullName}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{k.email}</div>
              </div>
              <span style={s.tag(k.status === 'APPROVED' ? '#00d4aa' : k.status === 'PENDING' ? '#f59e0b' : '#ef4444')}>{k.status}</span>
            </div>
          ))}
          {!kycList.length && <div style={{ color: '#64748b', fontSize: 13 }}>No KYC submissions yet</div>}
        </div>
      </div>
    </div>
  )
}

// ── REFERRAL ADMIN ────────────────────────────────────────
function ReferralAdminSection({ referralPools, token, s, reload }: any) {
  const [filter, setFilter] = useState('ALL')
  const [tab, setTab] = useState<'pools' | 'rebates'>('pools')
  const [activating, setActivating] = useState<any>(null)
  const [activateForm, setActivateForm] = useState({ tradingPlatform: 'MT4', brokerName: '', tradingAccountId: '', investorPassword: '', tradingServer: '' })
  const [activateLoading, setActivateLoading] = useState(false)
  const [activateError, setActivateError] = useState('')
  const [activateSuccess, setActivateSuccess] = useState('')
  const [rebateForm, setRebateForm] = useState({ referralPoolId: '', month: '', totalRebate: '', adminNotes: '' })
  const [rebateLoading, setRebateLoading] = useState(false)
  const [rebateError, setRebateError] = useState('')
  const [rebateSuccess, setRebateSuccess] = useState('')

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

  async function activatePool() {
    setActivateError(''); setActivateLoading(true)
    try {
      const r = await fetch('/api/batches/admin-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralPoolId: activating.id, ...activateForm }),
      })
      const d = await r.json()
      if (!r.ok) { setActivateError(d.error || 'Activation failed'); return }
      setActivateSuccess(`✓ Pool activated! Batch ${d.data?.batch?.batchCode} created. All members notified by email.`)
      setActivating(null)
      reload()
    } finally { setActivateLoading(false) }
  }

  async function submitRebate() {
    setRebateError(''); setRebateLoading(true)
    try {
      const r = await fetch('/api/referrals/rebates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...rebateForm, totalRebate: parseFloat(rebateForm.totalRebate) }),
      })
      const d = await r.json()
      if (!r.ok) { setRebateError(d.error || 'Failed'); return }
      setRebateSuccess(`✓ Rebate recorded. Creator bonus: $${d.data?.creatorBonus?.toLocaleString()}. Email sent.`)
      setRebateForm({ referralPoolId: '', month: '', totalRebate: '', adminNotes: '' })
    } finally { setRebateLoading(false) }
  }

  const filtered = filter === 'ALL' ? referralPools : referralPools.filter((p: any) => p.status === filter)
  const activePools = referralPools.filter((p: any) => p.status === 'ACTIVE')
  const fullPools = referralPools.filter((p: any) => p.status === 'FULL')

  return (
    <div>
      {fullPools.length > 0 && (
        <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.04)' }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⏳ {fullPools.length} Pool{fullPools.length > 1 ? 's' : ''} Ready for Activation</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>These pools have reached their target and need MT4/MT5 trading account details to go live.</div>
        </div>
      )}

      {activateSuccess && (
        <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#00d4aa', fontSize: 13 }}>
          {activateSuccess}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pools', 'rebates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...s.btn(tab === t ? 'primary' : 'ghost'), padding: '8px 18px', fontSize: 13 }}>
            {t === 'pools' ? '🔗 Referral Pools' : '💰 Monthly Rebates'}
          </button>
        ))}
      </div>

      {/* POOLS TAB */}
      {tab === 'pools' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['ALL', 'OPEN', 'FULL', 'ACTIVE', 'CLOSED'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...s.btn(filter === f ? 'primary' : 'ghost'), padding: '5px 14px', fontSize: 12 }}>{f}</button>
            ))}
          </div>

          {/* Activation inline form */}
          {activating && (
            <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#c9a84c' }}>⚡ Activate: {CATEGORY_LABELS[activating.category]} ({activating.referralCode})</div>
                <button onClick={() => { setActivating(null); setActivateError('') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              {activateError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {activateError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Trading Platform</label>
                  <select value={activateForm.tradingPlatform} onChange={e => setActivateForm(p => ({ ...p, tradingPlatform: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="MT4">MetaTrader 4 (MT4)</option>
                    <option value="MT5">MetaTrader 5 (MT5)</option>
                  </select>
                </div>
                {[
                  { key: 'brokerName', label: 'Broker Name', placeholder: 'e.g. Exness, ICMarkets' },
                  { key: 'tradingAccountId', label: 'Trading Account ID', placeholder: 'e.g. 12345678' },
                  { key: 'investorPassword', label: 'Investor Password', placeholder: 'Read-only password' },
                  { key: 'tradingServer', label: 'Server', placeholder: 'e.g. Exness-Real3' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input style={inputStyle} placeholder={f.placeholder} value={(activateForm as any)[f.key]} onChange={e => setActivateForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                ℹ️ All members (creator + paid investors) will receive trading credentials by email upon activation.
              </div>
              <button style={{ ...s.btn(), background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000' }} onClick={activatePool} disabled={activateLoading}>
                {activateLoading ? 'Activating...' : '⚡ Activate & Notify All Members'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((pool: any) => {
              const color = CATEGORY_COLORS[pool.category] || '#64748b'
              const paidMembers = pool.members?.filter((m: any) => ['PAID', 'ACTIVE'].includes(m.status)) || []
              const totalPaid = paidMembers.reduce((sum: number, m: any) => sum + Number(m.contribution), 0)
              const progress = pool.targetAmount ? (totalPaid / Number(pool.targetAmount)) * 100 : 0
              return (
                <div key={pool.id} style={{ ...s.card, border: `1px solid ${pool.status === 'FULL' ? 'rgba(245,158,11,0.4)' : '#1e2530'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color }}>{CATEGORY_LABELS[pool.category] || pool.category}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>/{pool.referralCode}</span>
                        <span style={s.tag(color)}>{pool.status}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>
                        Creator: <strong>{pool.creator?.fullName}</strong> <span style={{ color: '#64748b' }}>({pool.creator?.email})</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {paidMembers.length} paid member{paidMembers.length !== 1 ? 's' : ''} · ${totalPaid.toLocaleString()} / ${Number(pool.targetAmount || 0).toLocaleString()}
                      </div>
                    </div>
                    {pool.status === 'FULL' && (
                      <button style={{ ...s.btn(), background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000' }} onClick={() => { setActivating(pool); setActivateError('') }}>
                        ⚡ Activate Pool
                      </button>
                    )}
                  </div>
                  {pool.targetAmount && (
                    <div style={{ height: 6, background: '#1e2530', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: color, borderRadius: 3 }} />
                    </div>
                  )}
                  {paidMembers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {paidMembers.map((m: any) => (
                        <div key={m.id} style={{ background: '#080a0f', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#94a3b8' }}>
                          {m.investor?.fullName} · <span style={{ color }}>${Number(m.contribution).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 60 }}>No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}referral pools found</div>}
          </div>
        </div>
      )}

      {/* REBATES TAB */}
      {tab === 'rebates' && (
        <div>
          <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(201,168,76,0.2)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💰 Record Monthly Rebate</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Enter the total trading account rebate for a pool. The system calculates the creator's 10% bonus and emails them automatically.
            </div>
            {rebateError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {rebateError}</div>}
            {rebateSuccess && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 12 }}>{rebateSuccess}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Active Referral Pool</label>
                <select value={rebateForm.referralPoolId} onChange={e => setRebateForm(p => ({ ...p, referralPoolId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select pool...</option>
                  {activePools.map((p: any) => (
                    <option key={p.id} value={p.id}>{CATEGORY_LABELS[p.category] || p.category} — {p.referralCode} ({p.creator?.fullName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <input type="month" style={inputStyle} value={rebateForm.month.slice(0, 7)} onChange={e => setRebateForm(p => ({ ...p, month: e.target.value + '-01' }))} />
              </div>
              <div>
                <label style={labelStyle}>Total Pool Rebate ($)</label>
                <input type="number" step="0.01" placeholder="0.00" style={inputStyle} value={rebateForm.totalRebate} onChange={e => setRebateForm(p => ({ ...p, totalRebate: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Creator Bonus (10% — auto)</label>
                <div style={{ ...inputStyle, color: '#c9a84c', fontWeight: 700, background: 'rgba(201,168,76,0.06)', cursor: 'default', display: 'flex', alignItems: 'center' }}>
                  ${rebateForm.totalRebate ? (parseFloat(rebateForm.totalRebate) * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Admin Notes (optional)</label>
              <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="Any notes for the creator..." value={rebateForm.adminNotes} onChange={e => setRebateForm(p => ({ ...p, adminNotes: e.target.value }))} />
            </div>
            <button
              style={s.btn()}
              onClick={submitRebate}
              disabled={rebateLoading || !rebateForm.referralPoolId || !rebateForm.month || !rebateForm.totalRebate}
            >
              {rebateLoading ? 'Recording...' : '💰 Record Rebate & Notify Creator'}
            </button>
          </div>
          {activePools.length === 0 && (
            <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 40 }}>No active referral pools yet. Activate a pool first.</div>
          )}
        </div>
      )}
    </div>
  )
}
function KycDocViewer({ url, label, token }: { url: string; label: string; token: string }) {
  const [loading, setLoading] = useState(false)
  const [signingError, setSigningError] = useState('')

  const isPdf = url.includes('/raw/') || url.toLowerCase().endsWith('.pdf')

  async function openSigned() {
    setLoading(true); setSigningError('')
    try {
      const r = await fetch('/api/kyc/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url }),
      })
      const d = await r.json()
      if (!r.ok) { setSigningError(d.error || 'Failed to get link'); return }
      window.open(d.data.signedUrl, '_blank')
    } catch { setSigningError('Network error') }
    finally { setLoading(false) }
  }

if (isPdf) {
  return (
    <div style={{ background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <span style={{ fontSize: 28 }}>📄</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>PDF Document</div>
        </div>
        <button
          onClick={async () => {
  try {
    // Get a signed URL first
    const r = await fetch('/api/kyc/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url }),
    })
    const d = await r.json()
    const signedUrl = d.data?.signedUrl || url

    // Fetch the actual file using the signed URL
    const res = await fetch(signedUrl)
    if (!res.ok) { window.open(signedUrl, '_blank'); return }
    const blob = await res.blob()
    if (blob.size === 0) { window.open(signedUrl, '_blank'); return }
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${label.replace(/\s+/g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}}
          style={{ background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 7, padding: '7px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
        >
          ⬇ Download PDF
        </button>
      </div>
    </div>
  )
}

  return (
    <div style={{ background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, overflow: 'hidden' }}>
      <div onClick={openSigned} style={{ cursor: loading ? 'wait' : 'zoom-in', background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, overflow: 'hidden', position: 'relative' }}>
        <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { const el = e.target as HTMLImageElement; el.style.display = 'none'; const fb = el.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex' }} />
        <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, position: 'absolute', inset: 0, justifyContent: 'center' }}>
          <span style={{ fontSize: 28 }}>🖼</span><span>Click to open</span>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#94a3b8' }}>
          {loading ? '⏳ Loading...' : '🔍 View Full'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
        <button onClick={openSigned} disabled={loading} style={{ background: 'none', border: 'none', fontSize: 11, color: '#c9a84c', cursor: 'pointer', padding: 0 }}>
          {loading ? 'Loading...' : 'Open ↗'}
        </button>
      </div>
      {signingError && <div style={{ fontSize: 11, color: '#ef4444', padding: '4px 14px 8px' }}>⚠ {signingError}</div>}
    </div>
  )
}
// ── KYC ──────────────────────────────────────────────────
function KYCSection({ kycList, token, s, reload }: any) {
  const [selected, setSelected] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('PENDING')

  async function handleAction(action: 'approve' | 'reject') {
    if (!selected) return
    setLoading(true)
    try {
      const r = await fetch('/api/kyc/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ investorId: selected.investorId, action, adminNotes: notes }),
      })
      if (r.ok) { setSelected(null); setNotes(''); reload() }
    } finally { setLoading(false) }
  }

  const filtered = kycList.filter((k: any) => filter === 'ALL' || k.status === filter)
  const idTypeLabel: any = { voters_card: "Voter's Card", nin: 'NIN', drivers_licence: "Driver's Licence", international_passport: 'Int. Passport' }

  const docs = selected ? [
    { label: 'ID Front',         url: selected.idFrontUrl },
    { label: 'ID Back',          url: selected.idBackUrl },
    { label: 'Passport Photo',   url: selected.passportPhotoUrl },
    { label: 'Proof of Address', url: selected.proofOfAddressUrl },
  ].filter(d => d.url) : []

  return (
    <>
      
      <div className="kyc-split" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 20 }}>
        <div style={s.card}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...s.btn(filter === f ? 'primary' : 'ghost'), padding: '6px 14px', fontSize: 12 }}>{f}</button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>{['Investor', 'ID Type', 'Submitted', 'Status', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((k: any) => (
                  <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(k); setNotes('') }}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{k.fullName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{k.email}</div>
                    </td>
                    <td style={s.td}><span style={{ color: '#94a3b8' }}>{idTypeLabel[k.idType] || k.idType}</span></td>
                    <td style={s.td}><span style={{ color: '#64748b', fontSize: 12 }}>{new Date(k.submittedAt).toLocaleDateString()}</span></td>
                    <td style={s.td}><span style={s.tag(k.status === 'APPROVED' ? '#00d4aa' : k.status === 'PENDING' ? '#f59e0b' : '#ef4444')}>{k.status}</span></td>
                    <td style={s.td}><button style={{ ...s.btn('ghost'), fontSize: 12 }}>View →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No {filter.toLowerCase()} submissions</div>}
        </div>

        {selected && (
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>KYC Review</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ background: '#080a0f', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{selected.fullName}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{selected.email}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>ID Type: {idTypeLabel[selected.idType] || selected.idType}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
  <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>Documents</div>
  {docs.map(doc => (
    <KycDocViewer key={doc.label} url={doc.url} label={doc.label} token={token} />
  ))}
  {docs.length === 0 && (
    <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>No documents found</div>
  )}
</div>
            
            {selected.status === 'PENDING' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }}>Admin Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    style={{ width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' as const }}
                    placeholder="Reason for rejection etc..." />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleAction('approve')} disabled={loading} style={{ ...s.btn('primary'), flex: 1 }}>✓ Approve</button>
                  <button onClick={() => handleAction('reject')} disabled={loading} style={{ ...s.btn('danger'), flex: 1 }}>✕ Reject</button>
                </div>
              </>
            )}
            {selected.status !== 'PENDING' && (
              <div style={{ background: '#080a0f', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Reviewed: {selected.reviewedAt ? new Date(selected.reviewedAt).toLocaleDateString() : 'N/A'}</div>
                {selected.adminNotes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{selected.adminNotes}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── BATCHES ───────────────────────────────────────────────
const ADMIN_CATEGORY_CONFIG: Record<string, { target: number; min: number; max: number; label: string; color: string }> = {
  CENT:         { target: 100,   min: 10,   max: 50,   label: '$100 Pool',    color: '#00d4aa' },
  STANDARD_1K:  { target: 1000,  min: 100,  max: 500,  label: '$1,000 Pool',  color: '#818cf8' },
  STANDARD_5K:  { target: 5000,  min: 1000, max: 2500, label: '$5,000 Pool',  color: '#f59e0b' },
  STANDARD_10K: { target: 10000, min: 2500, max: 5000, label: '$10,000 Pool', color: '#c9a84c' },
}

function BatchSection({ batches, token, s, reload }: any) {
  const rate = useUsdNgnRate()
  const [showCreate, setShowCreate] = useState(false)
  const [category, setCategory] = useState('CENT')
  const [form, setForm] = useState({ batchCode: '', name: '', description: '', brokerName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createBatch() {
    setError(''); setLoading(true)
    const cfg = ADMIN_CATEGORY_CONFIG[category]
    try {
      const r = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          category,
          targetMembers: 10,
          contributionPerMember: cfg.min,
          targetCapital: cfg.target,
          targetAmount: cfg.target,
          minContribution: cfg.min,
          maxContribution: cfg.max,
        }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      setShowCreate(false)
      setForm({ batchCode: '', name: '', description: '', brokerName: '' })
      reload()
    } finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }
  const cfg = ADMIN_CATEGORY_CONFIG[category]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: '#64748b' }}>{batches.length} batches total</div>
        <button style={s.btn()} onClick={() => setShowCreate(p => !p)}>+ Create Batch</button>
      </div>

      {showCreate && (
        <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(201,168,76,0.2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>New Batch</div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Pool Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(ADMIN_CATEGORY_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            {[
              { key: 'batchCode', label: 'Batch Code', placeholder: 'BATCH-A' },
              { key: 'name', label: 'Name', placeholder: 'Batch Alpha' },
              { key: 'brokerName', label: 'Broker Name', placeholder: 'Optional' },
              { key: 'description', label: 'Description', placeholder: 'Optional' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input style={inputStyle} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          {cfg && (
            <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
              <strong style={{ color: cfg.color }}>{cfg.label}</strong> — Pool target: <strong style={{ color: '#e2e8f0' }}>${cfg.target.toLocaleString()}</strong>
              {rate && <span style={{ color: '#475569' }}> (≈ ₦{(cfg.target * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 })})</span>}
              {' '}· Member contribution: <strong style={{ color: '#e2e8f0' }}>${cfg.min}–${cfg.max}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btn()} onClick={createBatch} disabled={loading}>{loading ? 'Creating...' : 'Create Batch'}</button>
            <button style={s.btn('ghost')} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {batches.map((b: any) => {
          const bCfg = ADMIN_CATEGORY_CONFIG[b.category]
          const color = bCfg?.color || '#818cf8'
          const target = Number(b.targetAmount || b.targetCapital || 0)
          const current = Number(b.currentAmount || 0)
          const progress = target ? (current / target) * 100 : 0
          return (
            <div key={b.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{b.batchCode}</span>
                    <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : b.status === 'FULL' ? '#f59e0b' : '#64748b')}>{b.status}</span>
                    {b.category && <span style={s.tag(color)}>{bCfg?.label || b.category}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {bCfg
                      ? `Contribution $${bCfg.min}–$${bCfg.max} · Target $${target.toLocaleString()}`
                      : `$${parseFloat(b.contributionPerMember || 0).toLocaleString()} · Target $${target.toLocaleString()}`
                    }
                    {b.brokerName && ` · ${b.brokerName}`}
                  </div>
                  {target > 0 && (
                    <div style={{ maxWidth: 320 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Pool filled</span>
                        <span style={{ color }}>${current.toLocaleString()} / ${target.toLocaleString()}</span>
                      </div>
                      <div style={{ background: '#080a0f', borderRadius: 6, height: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${Math.min(100, progress)}%`, borderRadius: 6 }} />
                      </div>
                    </div>
                  )}
                  {/* Show trading details if active */}
                  {b.status === 'ACTIVE' && b.tradingAccountId && (
                    <div style={{ marginTop: 10, background: '#080a0f', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                      <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 6 }}>📊 {b.tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 6 }}>
                        {[['Broker', b.brokerName], ['Account ID', b.tradingAccountId], ['Password', b.investorPassword], ['Server', b.tradingServer]].map(([label, value]) => value ? (
                          <div key={label}><span style={{ color: '#64748b' }}>{label}: </span><span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{value}</span></div>
                        ) : null)}
                      </div>
                    </div>
                  )}
                </div>
                <BatchActivateOrAdvance batch={b} token={token} s={s} reload={reload} rate={rate} />
              </div>
            </div>
          )
        })}
        {!batches.length && <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 60 }}>No batches yet. Create your first batch above.</div>}
      </div>
    </div>
  )
}

function BatchActivateOrAdvance({ batch, token, s, reload, rate }: any) {
  const [showActivate, setShowActivate] = useState(false)
  const [activateForm, setActivateForm] = useState({ tradingPlatform: 'MT4', brokerName: batch.brokerName || '', tradingAccountId: '', investorPassword: '', tradingServer: '' })
  const [activateLoading, setActivateLoading] = useState(false)
  const [activateError, setActivateError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const next: any = { FORMING: null, FULL: null, ACTIVE: 'DISTRIBUTING', DISTRIBUTING: 'CLOSED' }
  const nextStatus = next[batch.status]
  const canActivate = ['FORMING', 'FULL'].includes(batch.status)

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }

  async function activateBatch() {
    setActivateError(''); setActivateLoading(true)
    try {
      const r = await fetch('/api/batches/admin-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchId: batch.id, ...activateForm }),
      })
      const d = await r.json()
      if (!r.ok) { setActivateError(d.error || 'Failed'); return }
      setShowActivate(false); reload()
    } finally { setActivateLoading(false) }
  }

  async function advanceStatus() {
    setStatusLoading(true)
    try {
      await fetch(`/api/batches/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      })
      reload()
    } finally { setStatusLoading(false) }
  }

  if (batch.status === 'CLOSED') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      {canActivate && (
        <button
          style={{ ...s.btn(), background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', fontSize: 12, whiteSpace: 'nowrap' as const }}
          onClick={() => setShowActivate(p => !p)}
        >
          ⚡ {showActivate ? 'Cancel' : 'Activate with MT4/MT5'}
        </button>
      )}
      {nextStatus && (
        <button style={{ ...s.btn('ghost'), fontSize: 12 }} onClick={advanceStatus} disabled={statusLoading}>→ {nextStatus}</button>
      )}
      {showActivate && (
        <div style={{ background: '#080a0f', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: 14, minWidth: 260 }}>
          {activateError && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>⚠ {activateError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <select value={activateForm.tradingPlatform} onChange={e => setActivateForm(p => ({ ...p, tradingPlatform: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="MT4">MetaTrader 4 (MT4)</option>
              <option value="MT5">MetaTrader 5 (MT5)</option>
            </select>
            {[
              ['brokerName', 'Broker Name'],
              ['tradingAccountId', 'Account ID'],
              ['investorPassword', 'Investor Password'],
              ['tradingServer', 'Server'],
            ].map(([key, placeholder]) => (
              <input key={key} style={inputStyle} placeholder={placeholder} value={(activateForm as any)[key]} onChange={e => setActivateForm(p => ({ ...p, [key]: e.target.value }))} />
            ))}
          </div>
          <button style={{ ...s.btn(), width: '100%', fontSize: 12, padding: '8px' }} onClick={activateBatch} disabled={activateLoading}>
            {activateLoading ? 'Activating...' : '⚡ Activate & Notify Members'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── INVESTORS ─────────────────────────────────────────────
function InvestorSection({ investors, batches, s }: any) {
  const [search, setSearch] = useState('')
  const filtered = investors.filter((inv: any) =>
    inv.fullName?.toLowerCase().includes(search.toLowerCase()) || inv.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 20 }}>
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>{['Investor', 'Phone', 'Nationality', 'Date of Birth', 'Wallet (TRC-20)', 'KYC Status', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((inv: any) => (
              <tr key={inv.id}>
                <td style={s.td}>
                  <div style={{ fontWeight: 600 }}>{inv.fullName}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{inv.email}</div>
                </td>
                <td style={s.td}><span style={{ color: '#94a3b8', fontSize: 12 }}>{inv.phone || '—'}</span></td>
                <td style={s.td}><span style={{ fontSize: 12, color: '#94a3b8' }}>{inv.nationality || 'Nigeria'}</span></td>
                <td style={s.td}><span style={{ fontSize: 12, color: '#94a3b8' }}>{inv.dateOfBirth || '—'}</span></td>
                <td style={s.td}>
                  {inv.walletAddress
                    ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa' }} title={inv.walletAddress}>{inv.walletAddress.slice(0, 8)}...{inv.walletAddress.slice(-5)}</span>
                    : <span style={{ color: '#475569', fontSize: 12 }}>Not set</span>
                  }
                </td>
                <td style={s.td}><span style={s.tag(inv.kycStatus === 'APPROVED' ? '#00d4aa' : inv.kycStatus === 'PENDING' ? '#f59e0b' : '#ef4444')}>{inv.kycStatus || 'NOT_SUBMITTED'}</span></td>
                <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(inv.createdAt).toLocaleDateString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No investors found</div>}
    </div>
  )
}

// ── WITHDRAWALS ───────────────────────────────────────────
function WithdrawalSection({ batches, token, s }: any) {
  const [form, setForm] = useState({ batchCode: '', profitAmount: '' })
  const [loading, setLoading] = useState(false)
  const [paymentDoneLoading, setPaymentDoneLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [payouts, setPayouts] = useState<any[]>([])
  const [batchTotals, setBatchTotals] = useState<Record<string,number>>({})
  const rate = useUsdNgnRate()

  useEffect(() => { loadPayouts() }, [])

  function loadPayouts() {
    fetch('/api/withdrawals/admin', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        setPayouts(d.data?.payouts || [])
        setBatchTotals(d.data?.batchTotals || {})
      })
  }

  async function activateWithdrawal() {
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/withdrawals/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      setMessage(`Withdrawal activated for ${form.batchCode}`)
      setForm({ batchCode: '', profitAmount: '' })
      loadPayouts()
    } finally { setLoading(false) }
  }

  async function markPaymentDone(batchCode: string) {
    setPaymentDoneLoading(true)
    try {
      const r = await fetch('/api/withdrawals/payment-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchCode }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Failed'); return }
      setMessage(`Payment marked as done for ${batchCode} — investors notified`)
      loadPayouts()
    } finally { setPaymentDoneLoading(false) }
  }

  function exportWallets(batchCode: string) {
    const batchPayouts = payouts.filter((p: any) => p.batchCode === batchCode && p.status === 'CONFIRMED')
    if (!batchPayouts.length) { setError('No confirmed payouts to export for ' + batchCode); return }
    // NowPayments batch payout template format
    // Ticker, Wallet Address, ExtraId, Amount in crypto (6 decimals), Fiat amount, Fiat currency, Payout description
    const rows = [
      'Ticker,Wallet Address,ExtraId (memo etc.),Amount in crypto (6 decimals only!),Fiat amount,Fiat currency,Payout description'
    ]
    batchPayouts.forEach((p: any) => {
      rows.push([
        'SOL',
        p.walletAddress || '',
        '',                             // no memo needed for SOL
        '',                             // leave blank — NowPayments will auto-calc from fiat
        parseFloat(p.amount).toFixed(2),
        'USD',
        `Club10 Pool ${batchCode} withdrawal — ${p.investorName}`
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `nowpayments-payout-${batchCode}-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const inputStyle = { background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13 }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }
  const activeBatches = batches.filter((b: any) => ['ACTIVE', 'DISTRIBUTING'].includes(b.status))

  // Group payouts by batch
  const batchGroups: Record<string, any[]> = {}
  payouts.forEach((p: any) => {
    if (!batchGroups[p.batchCode]) batchGroups[p.batchCode] = []
    batchGroups[p.batchCode].push(p)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Activate withdrawal */}
      <div style={{ ...s.card, border: '1px solid rgba(201,168,76,0.2)' }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Open Withdrawal Window</div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
        {message && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 12 }}>✓ {message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Batch</label>
            <select value={form.batchCode} onChange={e => setForm(p => ({ ...p, batchCode: e.target.value }))} style={{ ...inputStyle, width: '100%' }}>
              <option value="">Select batch...</option>
              {activeBatches.map((b: any) => <option key={b.id} value={b.batchCode}>{b.name} ({b.batchCode})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Total Profit ($)</label>
            <input type="number" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} placeholder="0.00" value={form.profitAmount} onChange={e => setForm(p => ({ ...p, profitAmount: e.target.value }))} />
          </div>
          <button style={s.btn()} onClick={activateWithdrawal} disabled={loading}>{loading ? '...' : 'Open Window'}</button>
        </div>
      </div>

      {/* Payout groups by batch */}
      {Object.entries(batchGroups).map(([batchCode, batchPayouts]) => {
        const totalCount = batchTotals[batchCode] || batchPayouts.length
        const confirmedCount = batchPayouts.filter((p: any) => p.status === 'CONFIRMED').length
        const totalAmount = batchPayouts.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
        const paymentDone = batchPayouts.every((p: any) => p.paymentDone)
        const allConfirmed = confirmedCount === totalCount
        const progress = Math.round((confirmedCount / totalCount) * 100)

        return (
          <div key={batchCode} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{batchCode} Withdrawals</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Total: <strong style={{ color: '#c9a84c' }}>${totalAmount.toLocaleString()}</strong>
                  {rate && <span style={{ color: '#475569' }}> (≈ ₦{(totalAmount * rate).toLocaleString('en-NG', { maximumFractionDigits: 0 })})</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={{ ...s.btn('ghost'), fontSize: 12 }} onClick={() => exportWallets(batchCode)}>
                  📥 Export Wallets CSV
                </button>
                {!paymentDone && allConfirmed && (
                  <button
                    style={{ ...s.btn(), background: 'linear-gradient(135deg,#00d4aa,#0099aa)', color: '#000', fontSize: 12 }}
                    onClick={() => markPaymentDone(batchCode)}
                    disabled={paymentDoneLoading}
                  >
                    {paymentDoneLoading ? '...' : '✓ Mark Payment Done'}
                  </button>
                )}
                {paymentDone && <span style={s.tag('#00d4aa')}>PAID</span>}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                <span>Confirmations received</span>
                <span style={{ color: progress === 100 ? '#00d4aa' : '#f59e0b' }}>{confirmedCount}/{totalCount}</span>
              </div>
              <div style={{ background: '#080a0f', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: progress === 100 ? '#00d4aa' : 'linear-gradient(90deg,#f59e0b,#c9a84c)', width: `${progress}%`, borderRadius: 6, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>{['Investor', 'Amount', 'USDT Wallet (TRC-20)', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {batchPayouts.map((p: any) => (
                    <tr key={p.id}>
                      <td style={s.td}><div style={{ fontWeight: 600, fontSize: 13 }}>{p.investorName}</div><div style={{ fontSize: 11, color: '#64748b' }}>{p.email}</div></td>
                      <td style={s.td}>
                        <span style={{ color: '#c9a84c', fontWeight: 600 }}>${parseFloat(p.amount || 0).toLocaleString()}</span>
                        <NgnEquiv usd={parseFloat(p.amount || 0)} rate={rate} />
                      </td>
                      <td style={s.td}>
                        {p.walletAddress
                          ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa' }}>{p.walletAddress.slice(0, 10)}...{p.walletAddress.slice(-6)}</span>
                          : <span style={{ color: '#ef4444', fontSize: 12 }}>⚠ Not set</span>
                        }
                      </td>
                      <td style={s.td}><span style={s.tag(p.paymentDone ? '#00d4aa' : p.status === 'CONFIRMED' ? '#f59e0b' : '#64748b')}>{p.paymentDone ? 'PAID' : p.status}</span></td>
                      <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(p.createdAt).toLocaleDateString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {!Object.keys(batchGroups).length && (
        <div style={{ ...s.card, textAlign: 'center', padding: 60, color: '#64748b' }}>No withdrawal requests yet</div>
      )}
    </div>
  )
}

// ── AUDIT ─────────────────────────────────────────────────
function AuditSection({ token, s }: any) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setLogs(d.data || []); setLoading(false) })
  }, [])

  return (
    <div style={s.card}>
      <div style={{ fontWeight: 700, marginBottom: 16 }}>Audit Trail</div>
      {loading ? <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>{['Actor', 'Action', 'Entity', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={s.td}><span style={{ fontSize: 13 }}>{log.actorEmail}</span></td>
                  <td style={s.td}><span style={{ color: '#c9a84c', fontSize: 13 }}>{log.action}</span></td>
                  <td style={s.td}><span style={{ color: '#64748b', fontSize: 12 }}>{log.entityType || '—'}</span></td>
                  <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!logs.length && !loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No audit logs yet</div>}
    </div>
  )
}

// ── BROADCAST SECTION ─────────────────────────────────────
const BROADCAST_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  INFO:    { color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.25)', label: 'Notice' },
  SUCCESS: { color: '#00d4aa', bg: 'rgba(0,212,170,0.08)',   border: 'rgba(0,212,170,0.25)',   label: 'Update' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  label: 'Alert' },
  URGENT:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)',    label: 'Urgent' },
}

function BroadcastSection({ token, broadcasts, s, reload }: any) {
  const [form, setForm] = useState({ title: '', message: '', type: 'INFO', expiresInHours: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function send() {
    if (!form.title || !form.message) { setError('Title and message required'); return }
    setSending(true); setError(''); setSuccess('')
    try {
      const r = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, expiresInHours: form.expiresInHours ? parseInt(form.expiresInHours) : null }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Failed to send'); return }
      setSuccess('Broadcast sent to all investors!')
      setForm({ title: '', message: '', type: 'INFO', expiresInHours: '' })
      reload()
    } finally { setSending(false) }
  }

  async function deactivate(id: string) {
    await fetch('/api/broadcast', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    reload()
  }

  const inputStyle: any = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
  const labelStyle: any = { fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

      {/* Compose */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📢 Send Broadcast to All Investors</div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>⚠ {error}</div>}
        {success && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: 'rgba(0,212,170,0.08)', borderRadius: 8 }}>✓ {success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Notification Title</label>
            <input style={inputStyle} placeholder="e.g. System Maintenance Notice" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="INFO">ℹ️ Info / Notice</option>
              <option value="SUCCESS">✅ Good News / Update</option>
              <option value="WARNING">⚠️ Warning / Alert</option>
              <option value="URGENT">🚨 Urgent</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Auto-Expire After</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.expiresInHours} onChange={e => setForm(p => ({ ...p, expiresInHours: e.target.value }))}>
              <option value="">Never (manual removal)</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="168">1 week</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Message</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Write your message to investors here..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            />
          </div>
        </div>

        {/* Preview */}
        {(form.title || form.message) && (() => {
          const cfg = BROADCAST_TYPE_CONFIG[form.type]
          return (
            <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
                PREVIEW — AS SEEN BY INVESTORS
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>{form.title || 'Untitled'}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{form.message || '…'}</div>
            </div>
          )
        })()}

        <button
          onClick={send}
          disabled={sending || !form.title || !form.message}
          style={{ background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 10, padding: '13px 28px', fontWeight: 800, fontSize: 14, cursor: sending ? 'wait' : 'pointer', opacity: !form.title || !form.message ? 0.5 : 1, fontFamily: 'inherit' }}
        >
          {sending ? 'Sending...' : '📢 Broadcast to All Investors →'}
        </button>
      </div>

      {/* Active broadcasts */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Active Broadcasts ({broadcasts.filter((b: any) => b).length})</div>
        {broadcasts.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No active broadcasts</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {broadcasts.map((b: any) => {
              const cfg = BROADCAST_TYPE_CONFIG[b.type] || BROADCAST_TYPE_CONFIG.INFO
              return (
                <div key={b.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 1 }}>{cfg.label.toUpperCase()}</span>
                      <span style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(b.createdAt).toLocaleString('en-GB')}
                      </span>
                      {b.expiresAt && (
                        <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                          · Expires {new Date(b.expiresAt).toLocaleString('en-GB')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{b.message}</div>
                  </div>
                  <button
                    onClick={() => deactivate(b.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}







