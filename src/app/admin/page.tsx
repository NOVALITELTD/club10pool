'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Section = 'overview' | 'batches' | 'investors' | 'kyc' | 'withdrawals' | 'audit'

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

  function logout() {
    localStorage.clear()
    router.push('/login')
  }

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
    logo: { padding: '24px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' },
    logoIcon: { width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#c9a84c,#8b5e1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0 },
    nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(201,168,76,0.12)' : 'transparent', color: active ? '#c9a84c' : '#64748b', border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', fontSize: 13, fontWeight: active ? 600 : 400 }),
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    topbar: { padding: '16px 28px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117' },
    content: { flex: 1, padding: 28, overflowY: 'auto' },
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24 },
    statCard: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    tag: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }),
    btn: (variant: 'primary' | 'danger' | 'ghost' = 'primary') => ({
      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: variant === 'primary' ? '#c9a84c' : variant === 'danger' ? '#ef4444' : 'transparent',
      color: variant === 'primary' ? '#000' : variant === 'danger' ? '#fff' : '#64748b',
      border: variant === 'ghost' ? '1px solid #1e2530' : 'none',
    }),
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 14px', color: '#64748b', borderBottom: '1px solid #1e2530', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const },
    td: { padding: '12px 14px', borderBottom: '1px solid #0f1520', verticalAlign: 'middle' as const },
  }

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>C</div>
          {sidebarOpen && <div><div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>Club10 Pool</div><div style={{ fontSize: 10, color: '#c9a84c', letterSpacing: 2 }}>ADMIN</div></div>}
        </div>
        <div style={s.nav}>
          {navItems.map(item => (
            <div key={item.id} style={s.navItem(section === item.id)} onClick={() => setSection(item.id)}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
              {sidebarOpen && item.badge ? <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{item.badge}</span> : null}
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 12px', borderTop: '1px solid #1e2530' }}>
          <div style={{ ...s.navItem(false), color: '#ef4444' }} onClick={logout}>
            <span style={{ fontSize: 18 }}>⏻</span>
            {sidebarOpen && <span>Logout</span>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>☰</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
              {navItems.find(n => n.id === section)?.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              <span style={{ color: '#c9a84c' }}>●</span> {user?.fullName || 'Admin'}
            </div>
          </div>
        </div>

        <div style={s.content}>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⊡ {pendingKyc} KYC Approval{pendingKyc > 1 ? 's' : ''} Pending</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Investors waiting for identity verification approval</div>
            </div>
            <button style={s.btn()} onClick={() => setSection('kyc')}>Review Now</button>
          </div>
        </div>
      )}

      <div style={s.grid2}>
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 20 }}>
      <div style={s.card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...s.btn(filter === f ? 'primary' : 'ghost'), padding: '6px 14px', fontSize: 12 }}>{f}</button>
          ))}
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              {['Investor', 'ID Type', 'Submitted', 'Status', 'Action'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((k: any) => (
              <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(k)}>
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
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>ID: {idTypeLabel[selected.idType] || selected.idType}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'ID Front', url: selected.idFrontUrl },
              { label: 'ID Back', url: selected.idBackUrl },
              { label: 'Passport Photo', url: selected.passportPhotoUrl },
              { label: 'Proof of Address', url: selected.proofOfAddressUrl },
            ].map(doc => (
              <a key={doc.label} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080a0f', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', border: '1px solid #1e2530' }}>
                <span style={{ fontSize: 13, color: '#e2e8f0' }}>{doc.label}</span>
                <span style={{ fontSize: 12, color: '#c9a84c' }}>View ↗</span>
              </a>
            ))}
          </div>
          {selected.status === 'PENDING' && (
            <>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Admin Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} placeholder="Reason for rejection etc..." />
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
      setShowCreate(false); setForm({ batchCode: '', name: '', description: '', targetMembers: '', contributionPerMember: '', brokerName: '' }); reload()
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
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
  return (
    <button style={{ ...s.btn('ghost'), fontSize: 12 }} onClick={updateStatus} disabled={loading}>
      → {nextStatus}
    </button>
  )
}

// ── INVESTORS ─────────────────────────────────────────────
function InvestorSection({ investors, batches, s }: any) {
  const [search, setSearch] = useState('')
  const [filterBatch, setFilterBatch] = useState('ALL')

  const filtered = investors.filter((inv: any) => {
    const matchSearch = inv.fullName?.toLowerCase().includes(search.toLowerCase()) || inv.email?.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13 }} />
      </div>
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
                  <div>
                    <div style={{ fontSize: 12 }}>{inv.bankName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{inv.bankAccount}</div>
                  </div>
                ) : <span style={{ color: '#64748b', fontSize: 12 }}>Not set</span>}
              </td>
              <td style={s.td}><span style={s.tag((inv as any).kycStatus === 'APPROVED' ? '#00d4aa' : (inv as any).kycStatus === 'PENDING' ? '#f59e0b' : '#ef4444')}>{(inv as any).kycStatus || 'NOT_SUBMITTED'}</span></td>
              <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(inv.createdAt).toLocaleDateString()}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
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
      )}
      {!logs.length && !loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No audit logs yet</div>}
    </div>
  )
}
