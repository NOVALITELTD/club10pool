'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Section = 'overview' | 'batches' | 'investors' | 'kyc' | 'withdrawals' | 'audit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// Build a public URL from whatever is stored (full URL or just a path)
function getStorageUrl(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  // raw is a storage path like "kyc-documents/abc/front.jpg"
  return `${SUPABASE_URL}/storage/v1/object/public/${raw}`
}

export default function AdminDashboard() {
  const router = useRouter()
  const [section, setSection] = useState<Section>('overview')
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [investors, setInvestors] = useState<any[]>([])
  const [kycList, setKycList] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
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
  }, [])

  async function loadData(token: string) {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [statsRes, batchRes, invRes, kycRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/batches', { headers }),
        fetch('/api/investors', { headers }),
        fetch('/api/kyc/admin', { headers }),
      ])
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.data) }
      if (batchRes.ok) { const d = await batchRes.json(); setBatches(d.data || []) }
      if (invRes.ok) { const d = await invRes.json(); setInvestors(d.data || []) }
      if (kycRes.ok) { const d = await kycRes.json(); setKycList(d.data || []) }
    } finally { setLoading(false) }
  }

  function logout() { localStorage.clear(); router.push('/login') }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const navItems: { id: Section; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'batches', label: 'Batch Management', icon: '⬡' },
    { id: 'investors', label: 'Investor Accounts', icon: '◎' },
    { id: 'kyc', label: 'KYC Approvals', icon: '⊡', badge: kycList.filter(k => k.status === 'PENDING').length },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⟁' },
    { id: 'audit', label: 'Audit Logs', icon: '≡' },
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
          .admin-sidebar { display: none !important; }
          .admin-content { padding: 16px !important; }
          .admin-topbar { padding: 12px 16px !important; }
          .admin-grid2 { grid-template-columns: 1fr !important; }
          .kyc-split { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.app}>
        {/* SIDEBAR */}
        <div className="admin-sidebar" style={s.sidebar}>
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
              <div key={item.id} style={s.navItem(section === item.id)} onClick={() => setSection(item.id)}>
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
                {section === 'overview' && <OverviewSection stats={stats} batches={batches} investors={investors} kycList={kycList} s={s} setSection={setSection} />}
                {section === 'batches' && <BatchSection batches={batches} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'investors' && <InvestorSection investors={investors} batches={batches} s={s} />}
                {section === 'kyc' && <KYCSection kycList={kycList} token={token!} s={s} reload={() => loadData(token!)} />}
                {section === 'withdrawals' && <WithdrawalSection batches={batches} token={token!} s={s} />}
                {section === 'audit' && <AuditSection token={token!} s={s} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────
function OverviewSection({ stats, batches, investors, kycList, s, setSection }: any) {
  const pendingKyc = kycList.filter((k: any) => k.status === 'PENDING').length
  const activeBatches = batches.filter((b: any) => b.status === 'ACTIVE').length
  const totalCapital = batches.reduce((sum: number, b: any) => sum + parseFloat(b.targetCapital || 0), 0)

  return (
    <div>
      <div style={s.grid4}>
        {[
          { label: 'Total Investors', value: investors.length, color: '#c9a84c', icon: '◎' },
          { label: 'Active Batches', value: activeBatches, color: '#00d4aa', icon: '⬡' },
          { label: 'Total Capital', value: `₦${totalCapital.toLocaleString()}`, color: '#818cf8', icon: '◈' },
          { label: 'Pending KYC', value: pendingKyc, color: '#f59e0b', icon: '⊡' },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={{ fontSize: 24, color: stat.color }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {pendingKyc > 0 && (
        <div style={{ ...s.card, marginBottom: 24, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⊡ {pendingKyc} KYC Approval{pendingKyc > 1 ? 's' : ''} Pending</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Investors waiting for identity verification approval</div>
            </div>
            <button style={s.btn()} onClick={() => setSection('kyc')}>Review Now</button>
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

// ── KYC ──────────────────────────────────────────────────
function KYCSection({ kycList, token, s, reload }: any) {
  const [selected, setSelected] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('PENDING')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    { label: 'ID Front', url: getStorageUrl(selected.idFrontUrl) },
    { label: 'ID Back', url: getStorageUrl(selected.idBackUrl) },
    { label: 'Passport Photo', url: getStorageUrl(selected.passportPhotoUrl) },
    { label: 'Proof of Address', url: getStorageUrl(selected.proofOfAddressUrl) },
  ].filter(d => d.url) : []

  return (
    <>
      {/* Image preview lightbox */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}
        >
          <img src={previewUrl} alt="KYC Document" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setPreviewUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      <div className="kyc-split" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 20 }}>
        {/* List */}
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

        {/* Detail panel */}
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

            {/* Document thumbnails + links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>Documents</div>
              {docs.map(doc => (
                <div key={doc.label} style={{ background: '#080a0f', border: '1px solid #1e2530', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewUrl(doc.url)}
                    style={{ cursor: 'zoom-in', background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, overflow: 'hidden', position: 'relative' }}
                  >
                    <img
                      src={doc.url}
                      alt={doc.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        const fb = el.nextElementSibling as HTMLElement
                        if (fb) fb.style.display = 'flex'
                      }}
                    />
                    {/* Fallback if image fails */}
                    <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12, position: 'absolute', inset: 0, justifyContent: 'center' }}>
                      <span style={{ fontSize: 28 }}>📄</span>
                      <span>Click to open</span>
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#94a3b8' }}>🔍 Preview</div>
                  </div>
                  {/* Footer with label + open link */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{doc.label}</span>
                    <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#c9a84c', textDecoration: 'none' }}>Open ↗</a>
                  </div>
                </div>
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
function BatchSection({ batches, token, s, reload }: any) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ batchCode: '', name: '', description: '', targetMembers: '', contributionPerMember: '', brokerName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createBatch() {
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          targetMembers: parseInt(form.targetMembers),
          contributionPerMember: parseFloat(form.contributionPerMember),
          targetCapital: parseInt(form.targetMembers) * parseFloat(form.contributionPerMember),
        }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      setShowCreate(false)
      setForm({ batchCode: '', name: '', description: '', targetMembers: '', contributionPerMember: '', brokerName: '' })
      reload()
    } finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { key: 'batchCode', label: 'Batch Code', placeholder: 'BATCH-A' },
              { key: 'name', label: 'Name', placeholder: 'Batch Alpha' },
              { key: 'targetMembers', label: 'Target Members', placeholder: '10' },
              { key: 'contributionPerMember', label: 'Contribution Per Member (₦)', placeholder: '100000' },
              { key: 'brokerName', label: 'Broker Name', placeholder: 'Optional' },
              { key: 'description', label: 'Description', placeholder: 'Optional' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input style={inputStyle} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={s.btn()} onClick={createBatch} disabled={loading}>{loading ? 'Creating...' : 'Create Batch'}</button>
            <button style={s.btn('ghost')} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {batches.map((b: any) => (
          <div key={b.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{b.batchCode}</span>
                  <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : '#64748b')}>{b.status}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Target: {b.targetMembers} members · ₦{parseFloat(b.contributionPerMember).toLocaleString()} each · Total ₦{parseFloat(b.targetCapital).toLocaleString()}
                </div>
              </div>
              <BatchStatusChanger batch={b} token={token} s={s} reload={reload} />
            </div>
          </div>
        ))}
        {!batches.length && <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 60 }}>No batches yet. Create your first batch above.</div>}
      </div>
    </div>
  )
}

function BatchStatusChanger({ batch, token, s, reload }: any) {
  const [loading, setLoading] = useState(false)
  const next: any = { FORMING: 'ACTIVE', ACTIVE: 'DISTRIBUTING', DISTRIBUTING: 'CLOSED' }
  const nextStatus = next[batch.status]

  async function updateStatus() {
    setLoading(true)
    try {
      await fetch(`/api/batches/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      })
      reload()
    } finally { setLoading(false) }
  }

  if (!nextStatus) return null
  return <button style={{ ...s.btn('ghost'), fontSize: 12 }} onClick={updateStatus} disabled={loading}>→ {nextStatus}</button>
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
            <tr>{['Investor', 'Phone', 'Bank Details', 'KYC Status', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((inv: any) => (
              <tr key={inv.id}>
                <td style={s.td}>
                  <div style={{ fontWeight: 600 }}>{inv.fullName}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{inv.email}</div>
                </td>
                <td style={s.td}><span style={{ color: '#94a3b8', fontSize: 12 }}>{inv.phone || '—'}</span></td>
                <td style={s.td}>
                  {inv.bankName ? (
                    <div><div style={{ fontSize: 12 }}>{inv.bankName}</div><div style={{ fontSize: 11, color: '#64748b' }}>{inv.bankAccount}</div></div>
                  ) : <span style={{ color: '#64748b', fontSize: 12 }}>Not set</span>}
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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [payouts, setPayouts] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/withdrawals/admin', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPayouts(d.data || []))
  }, [])

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
    } finally { setLoading(false) }
  }

  const inputStyle = { background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13 }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }
  const activeBatches = batches.filter((b: any) => b.status === 'ACTIVE' || b.status === 'DISTRIBUTING')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...s.card, border: '1px solid rgba(201,168,76,0.2)' }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Activate Withdrawal</div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
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
            <label style={labelStyle}>Total Profit (₦)</label>
            <input type="number" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }} placeholder="0.00" value={form.profitAmount} onChange={e => setForm(p => ({ ...p, profitAmount: e.target.value }))} />
          </div>
          <button style={s.btn()} onClick={activateWithdrawal} disabled={loading}>{loading ? '...' : 'Activate'}</button>
        </div>
      </div>

      <div style={s.card}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Payout Requests</div>
        {payouts.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>{['Investor', 'Batch', 'Amount', 'Bank', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p.id}>
                    <td style={s.td}><div style={{ fontWeight: 600, fontSize: 13 }}>{p.investorName}</div></td>
                    <td style={s.td}><span style={{ fontSize: 12, color: '#94a3b8' }}>{p.batchCode}</span></td>
                    <td style={s.td}><span style={{ color: '#c9a84c', fontWeight: 600 }}>₦{parseFloat(p.amount || 0).toLocaleString()}</span></td>
                    <td style={s.td}><div style={{ fontSize: 12 }}>{p.bankName}<br /><span style={{ color: '#64748b' }}>{p.bankAccount}</span></div></td>
                    <td style={s.td}><span style={s.tag(p.status === 'CONFIRMED' ? '#00d4aa' : '#f59e0b')}>{p.status}</span></td>
                    <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(p.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No payout requests yet</div>}
      </div>
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
