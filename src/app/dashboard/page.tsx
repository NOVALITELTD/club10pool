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

  useEffect(() => {
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
    logo: { padding: '24px 20px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' },
    logoIcon: { width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#0099aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', flexShrink: 0 },
    nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
    navItem: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(0,212,170,0.1)' : 'transparent', color: active ? '#00d4aa' : '#64748b', border: active ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', fontSize: 13, fontWeight: active ? 600 : 400 }),
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    topbar: { padding: '16px 28px', borderBottom: '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117' },
    content: { flex: 1, padding: 28, overflowY: 'auto' },
    card: { background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 24 },
    tag: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }),
    btn: (variant: 'primary' | 'danger' | 'ghost' = 'primary') => ({ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: variant === 'primary' ? '#00d4aa' : variant === 'danger' ? '#ef4444' : 'transparent', color: variant === 'primary' ? '#000' : variant === 'danger' ? '#fff' : '#64748b', border: variant === 'ghost' ? '1px solid #1e2530' : 'none' }),
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
    th: { textAlign: 'left' as const, padding: '10px 14px', color: '#64748b', borderBottom: '1px solid #1e2530', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const },
    td: { padding: '12px 14px', borderBottom: '1px solid #0f1520' },
  }

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoIcon}>C</div>
          {sidebarOpen && <div><div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>Club10 Pool</div><div style={{ fontSize: 10, color: '#00d4aa', letterSpacing: 2 }}>INVESTOR</div></div>}
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
          {sidebarOpen && <div style={{ fontSize: 11, color: '#64748b', padding: '0 12px', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>}
          <div style={{ ...s.navItem(false), color: '#ef4444' }} onClick={logout}>
            <span style={{ fontSize: 18 }}>⏻</span>
            {sidebarOpen && <span>Logout</span>}
          </div>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>☰</button>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{navItems.find(n => n.id === section)?.label}</div>
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            <span style={{ color: '#00d4aa' }}>●</span> {user?.fullName}
          </div>
        </div>

        <div style={s.content}>
          {loading ? <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>Loading...</div> : (
            <>
              {section === 'portfolio' && <PortfolioSection myBatch={myBatch} transactions={transactions} s={s} setSection={setSection} />}
              {section === 'batches' && <BatchesSection batches={batches} myBatch={myBatch} token={token!} s={s} reload={() => loadData(token!)} />}
              {section === 'withdrawals' && <WithdrawalsSection withdrawal={withdrawal} myBatch={myBatch} user={user} token={token!} s={s} reload={() => loadData(token!)} />}
              {section === 'settings' && <SettingsSection user={user} token={token!} s={s} setUser={setUser} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PORTFOLIO ─────────────────────────────────────────────
function PortfolioSection({ myBatch, transactions, s, setSection }: any) {
  if (!myBatch) return (
    <div style={{ textAlign: 'center', padding: '80px 40px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Capital Invested', value: `₦${capital.toLocaleString()}`, color: '#00d4aa' },
          { label: 'Share Percent', value: `${sharePercent.toFixed(2)}%`, color: '#c9a84c' },
          { label: 'Total Profit Earned', value: `₦${totalProfit.toLocaleString()}`, color: '#818cf8' },
          { label: 'Batch Status', value: myBatch.status, color: myBatch.status === 'ACTIVE' ? '#00d4aa' : '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{myBatch.name}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{myBatch.batchCode} · {myBatch.brokerName || 'No broker set'}</div>
        <div style={{ background: '#080a0f', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#00d4aa,#0099aa)', width: `${Math.min(100, (myBatch._count?.members || 0) / myBatch.targetMembers * 100)}%`, transition: 'width 0.5s ease', borderRadius: 8 }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{myBatch._count?.members || 0} / {myBatch.targetMembers} members</div>
      </div>

      <div style={{ ...s.card, marginTop: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Transaction History</div>
        {transactions.length ? (
          <table style={s.table}>
            <thead><tr>{['Type', 'Amount', 'Status', 'Date'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {transactions.slice(0, 10).map((tx: any) => (
                <tr key={tx.id}>
                  <td style={s.td}><span style={{ color: tx.type === 'PROFIT_SHARE' ? '#00d4aa' : tx.type === 'DEPOSIT' ? '#818cf8' : '#94a3b8', fontSize: 13 }}>{tx.type}</span></td>
                  <td style={s.td}><span style={{ fontWeight: 600, color: '#c9a84c' }}>₦{parseFloat(tx.amount).toLocaleString()}</span></td>
                  <td style={s.td}><span style={s.tag(tx.status === 'CONFIRMED' ? '#00d4aa' : '#f59e0b')}>{tx.status}</span></td>
                  <td style={s.td}><span style={{ fontSize: 12, color: '#64748b' }}>{new Date(tx.createdAt).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
      const r = await fetch(`/api/batches/${batchId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{b.batchCode}</span>
                    <span style={s.tag(b.status === 'ACTIVE' ? '#00d4aa' : b.status === 'FORMING' ? '#818cf8' : '#64748b')}>{b.status}</span>
                    {isMyBatch && <span style={s.tag('#c9a84c')}>MY BATCH</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    ₦{parseFloat(b.contributionPerMember).toLocaleString()} contribution · {b._count?.members || 0}/{b.targetMembers} members
                    {b.brokerName && ` · ${b.brokerName}`}
                  </div>
                  <div style={{ background: '#080a0f', borderRadius: 6, height: 6, width: 240, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#818cf8', width: `${Math.min(100, (b._count?.members || 0) / b.targetMembers * 100)}%`, borderRadius: 6 }} />
                  </div>
                </div>
                {canJoin && (
                  <button style={s.btn()} onClick={() => requestJoin(b.id)} disabled={loading === b.id}>
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
    <div style={{ textAlign: 'center', padding: '80px 40px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Withdrawals Locked</div>
      <div style={{ color: '#64748b', fontSize: 14 }}>Withdrawals are not currently active. Admin will notify you when profit distributions open.</div>
    </div>
  )

  if (confirmed || withdrawal?.status === 'CONFIRMED') return (
    <div style={{ textAlign: 'center', padding: '80px 40px' }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>✓</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#00d4aa' }}>Payout Confirmed</div>
      <div style={{ color: '#64748b', fontSize: 14 }}>Your payout request has been submitted. Admin will process the transfer to your bank account.</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ ...s.card, border: '1px solid rgba(0,212,170,0.3)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#00d4aa', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>Withdrawal Active</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#c9a84c', marginBottom: 4 }}>
          ₦{parseFloat(withdrawal.amount || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Your profit share for {withdrawal.batchCode}</div>
      </div>

      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Payout To</div>
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
function SettingsSection({ user, token, s, setUser }: any) {
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', bankName: user?.bankName || '', bankAccount: user?.bankAccount || '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save() {
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/investors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      const updated = { ...user, ...form }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      setMessage('Settings saved successfully')
    } finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Account Details</div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 12 }}>✓ {message}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} /></div>
          <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          <div style={{ borderTop: '1px solid #1e2530', paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Bank details are used for withdrawals. Make sure they are accurate.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelStyle}>Bank Name</label><input style={inputStyle} value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="e.g. GTBank, Access, Zenith" /></div>
              <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={form.bankAccount} onChange={e => setForm(p => ({ ...p, bankAccount: e.target.value }))} placeholder="10-digit account number" /></div>
            </div>
          </div>
          <button style={s.btn()} onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      <div style={{ ...s.card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Account Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ label: 'Email', value: user?.email }, { label: 'KYC Status', value: user?.kycStatus }].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid #1e2530' }}>
              <span style={{ color: '#64748b' }}>{item.label}</span>
              <span style={{ color: item.label === 'KYC Status' ? '#00d4aa' : '#e2e8f0' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
