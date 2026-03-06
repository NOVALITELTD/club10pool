'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Badge from '@/components/Badge'
import StatCard from '@/components/StatCard'

function fmt(n: any) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    setUser(userData ? JSON.parse(userData) : null)

    fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setStats(d) })
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>OVERVIEW</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Dashboard</h1>
            <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.fullName || user?.email}</div>
            <button onClick={handleLogout} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 16px', color: 'var(--muted)',
              fontSize: 12, cursor: 'pointer',
            }}>Logout</button>
          </div>
        </div>

        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Investors" value={stats.totalInvestors} icon="◎" />
              <StatCard label="Active Batches" value={stats.activeBatches} icon="◉" color="var(--accent)" />
              <StatCard label="Total Deposited" value={fmt(stats.totalDeposited)} icon="◆" color="#c9a84c" />
              <StatCard label="Profit Distributed" value={fmt(stats.totalProfitDistributed)} icon="◇" color="#22c97a" />
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Batches</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Batch', 'Members', 'Target Capital', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', fontSize: 11, color: 'var(--muted)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.batchSummary?.map((b: any) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{b.name}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{b._count.members}/{b.targetMembers}</td>
                      <td style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono', fontSize: 13, color: '#c9a84c' }}>{fmt(b.targetCapital)}</td>
                      <td style={{ padding: '12px 20px' }}><Badge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Transactions</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Investor', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', fontSize: 11, color: 'var(--muted)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions?.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 20px', fontSize: 13 }}>{tx.investor?.fullName}</td>
                      <td style={{ padding: '12px 20px' }}><Badge status={tx.type} /></td>
                      <td style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: tx.type === 'WITHDRAWAL' ? '#ef4444' : 'var(--accent)' }}>
                        {tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)}
                      </td>
                      <td style={{ padding: '12px 20px' }}><Badge status={tx.status} /></td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stats.recentTransactions?.length && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No transactions yet</div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
