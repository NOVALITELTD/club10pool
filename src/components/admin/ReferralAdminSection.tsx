'use client'
// src/components/admin/ReferralAdminSection.tsx
// Add this section to the admin dashboard
// 1. Import and add 'referrals' to the Section type in admin/page.tsx
// 2. Add nav item: { id: 'referrals', label: 'Referral Pools', icon: '🔗' }
// 3. Add: {section === 'referrals' && <ReferralAdminSection token={token!} s={s} />}

import { useState, useEffect } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}
const CATEGORY_COLORS: Record<string, string> = {
  CENT: '#00d4aa', STANDARD_1K: '#818cf8',
  STANDARD_5K: '#f59e0b', STANDARD_10K: '#c9a84c',
}
const PLATFORM_LABELS: Record<string, string> = { MT4: 'MetaTrader 4', MT5: 'MetaTrader 5' }

type AdminTab = 'pools' | 'rebates'

export default function ReferralAdminSection({ token, s }: any) {
  const [tab, setTab] = useState<AdminTab>('pools')
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  // Activation form
  const [activating, setActivating] = useState<any>(null)
  const [activateForm, setActivateForm] = useState({
    tradingPlatform: 'MT4', brokerName: '', tradingAccountId: '',
    investorPassword: '', tradingServer: '',
  })
  const [activateLoading, setActivateLoading] = useState(false)
  const [activateError, setActivateError] = useState('')
  const [activateSuccess, setActivateSuccess] = useState('')

  // Rebate form
  const [rebateForm, setRebateForm] = useState({ referralPoolId: '', month: '', totalRebate: '', adminNotes: '' })
  const [rebateLoading, setRebateLoading] = useState(false)
  const [rebateError, setRebateError] = useState('')
  const [rebateSuccess, setRebateSuccess] = useState('')
  const [allRebates, setAllRebates] = useState<any[]>([])

  useEffect(() => { loadPools() }, [])

  async function loadPools() {
    setLoading(true)
    try {
      // Fetch all referral pools via admin endpoint
      const r = await fetch('/api/referrals/admin', { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) { const d = await r.json(); setPools(d.data || []) }
    } finally { setLoading(false) }
  }

  async function activatePool() {
    if (!activating) return
    setActivateError(''); setActivateLoading(true)
    try {
      const r = await fetch('/api/batches/admin-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          referralPoolId: activating.id,
          ...activateForm,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setActivateError(d.error || 'Activation failed'); return }
      setActivateSuccess(`Pool activated! Batch ${d.data?.batch?.batchCode} created.`)
      setActivating(null)
      loadPools()
    } finally { setActivateLoading(false) }
  }

  async function submitRebate() {
    setRebateError(''); setRebateLoading(true)
    try {
      const r = await fetch('/api/referrals/rebates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...rebateForm,
          totalRebate: parseFloat(rebateForm.totalRebate),
        }),
      })
      const d = await r.json()
      if (!r.ok) { setRebateError(d.error || 'Failed to record rebate'); return }
      setRebateSuccess(`Rebate recorded. Creator bonus: $${d.data?.creatorBonus?.toLocaleString()}. Email sent.`)
      setRebateForm({ referralPoolId: '', month: '', totalRebate: '', adminNotes: '' })
    } finally { setRebateLoading(false) }
  }

  const filtered = filter === 'ALL' ? pools : pools.filter(p => p.status === filter)
  const fullPools = pools.filter(p => p.status === 'FULL')

  const inputStyle = { width: '100%', background: '#080a0f', border: '1px solid #1e2530', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' as const }

  return (
    <div>
      {/* Alert: pools awaiting activation */}
      {fullPools.length > 0 && (
        <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24 }}>⏳</div>
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                {fullPools.length} Pool{fullPools.length > 1 ? 's' : ''} Ready for Activation
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Referral pools have reached their target and need MT4/MT5 details to activate.</div>
            </div>
          </div>
        </div>
      )}

      {activateSuccess && (
        <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#00d4aa', fontSize: 13 }}>
          ✓ {activateSuccess}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['pools', 'Referral Pools'], ['rebates', 'Monthly Rebates']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as AdminTab)} style={{ ...s.btn(tab === id ? 'primary' : 'ghost'), padding: '8px 18px', fontSize: 13 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── POOLS TAB ── */}
      {tab === 'pools' && (
        <div>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['ALL', 'OPEN', 'FULL', 'ACTIVE', 'CLOSED'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...s.btn(filter === f ? 'primary' : 'ghost'), padding: '5px 14px', fontSize: 12 }}>{f}</button>
            ))}
          </div>

          {/* Activation form modal */}
          {activating && (
            <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#c9a84c' }}>
                  ⚡ Activate: {CATEGORY_LABELS[activating.category]} ({activating.referralCode})
                </div>
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
                  { key: 'brokerName',       label: 'Broker Name',       placeholder: 'e.g. Exness, ICMarkets' },
                  { key: 'tradingAccountId', label: 'Trading Account ID', placeholder: 'e.g. 12345678' },
                  { key: 'investorPassword', label: 'Investor Password',  placeholder: 'Read-only password' },
                  { key: 'tradingServer',    label: 'Server',             placeholder: 'e.g. Exness-Real3' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input style={inputStyle} placeholder={f.placeholder} value={(activateForm as any)[f.key]} onChange={e => setActivateForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#64748b' }}>
                ℹ️ Once activated, all members (including the creator) will receive an email with these trading details.
              </div>
              <button style={s.btn()} onClick={activatePool} disabled={activateLoading}>
                {activateLoading ? 'Activating...' : '⚡ Activate Pool & Notify Members'}
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading pools...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((pool: any) => {
                const color = CATEGORY_COLORS[pool.category] || '#64748b'
                const paidMembers = pool.members?.filter((m: any) => ['PAID', 'ACTIVE'].includes(m.status)) || []
                const totalPaid = paidMembers.reduce((sum: number, m: any) => sum + Number(m.contribution), 0)
                const progress = (totalPaid / Number(pool.targetAmount)) * 100

                return (
                  <div key={pool.id} style={{ ...s.card, border: `1px solid ${pool.status === 'FULL' ? 'rgba(245,158,11,0.4)' : '#1e2530'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color }}>{CATEGORY_LABELS[pool.category]}</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>/{pool.referralCode}</span>
                          <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{pool.status}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                          Creator: <strong>{pool.creator?.fullName}</strong>
                          <span style={{ color: '#64748b' }}> ({pool.creator?.email})</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {paidMembers.length} paid member{paidMembers.length !== 1 ? 's' : ''} · ${totalPaid.toLocaleString()} / ${Number(pool.targetAmount).toLocaleString()}
                        </div>
                      </div>
                      {pool.status === 'FULL' && (
                        <button
                          style={{ ...s.btn(), background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000' }}
                          onClick={() => { setActivating(pool); setActivateError(''); setActivateSuccess('') }}
                        >
                          ⚡ Activate Pool
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, background: '#1e2530', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: color, borderRadius: 3 }} />
                    </div>

                    {/* Members mini list */}
                    {paidMembers.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
              {filtered.length === 0 && (
                <div style={{ ...s.card, textAlign: 'center', color: '#64748b', padding: 60 }}>
                  No {filter !== 'ALL' ? filter.toLowerCase() : ''} referral pools found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REBATES TAB ── */}
      {tab === 'rebates' && (
        <div>
          {/* Record new rebate */}
          <div style={{ ...s.card, marginBottom: 20, border: '1px solid rgba(201,168,76,0.2)' }}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>💰 Record Monthly Rebate</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Enter the total trading account rebate for the month. The system automatically calculates the creator's 10% bonus and notifies them by email.
            </div>
            {rebateError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {rebateError}</div>}
            {rebateSuccess && <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 12 }}>✓ {rebateSuccess}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Referral Pool</label>
                <select value={rebateForm.referralPoolId} onChange={e => setRebateForm(p => ({ ...p, referralPoolId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select active pool...</option>
                  {pools.filter(p => p.status === 'ACTIVE').map((p: any) => (
                    <option key={p.id} value={p.id}>{CATEGORY_LABELS[p.category]} — {p.referralCode} ({p.creator?.fullName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <input type="month" style={inputStyle} value={rebateForm.month} onChange={e => setRebateForm(p => ({ ...p, month: e.target.value + '-01' }))} />
              </div>
              <div>
                <label style={labelStyle}>Total Pool Rebate ($)</label>
                <input type="number" step="0.01" placeholder="0.00" style={inputStyle} value={rebateForm.totalRebate} onChange={e => setRebateForm(p => ({ ...p, totalRebate: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Creator Bonus (10% — auto)</label>
                <div style={{ ...inputStyle, color: '#c9a84c', fontWeight: 700, background: 'rgba(201,168,76,0.06)' }}>
                  ${rebateForm.totalRebate ? (parseFloat(rebateForm.totalRebate) * 0.1).toLocaleString() : '0.00'}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Admin Notes (optional)</label>
              <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Any notes for the creator..." value={rebateForm.adminNotes} onChange={e => setRebateForm(p => ({ ...p, adminNotes: e.target.value }))} />
            </div>
            <button style={s.btn()} onClick={submitRebate} disabled={rebateLoading || !rebateForm.referralPoolId || !rebateForm.month || !rebateForm.totalRebate}>
              {rebateLoading ? 'Recording...' : '💰 Record Rebate & Notify Creator'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
