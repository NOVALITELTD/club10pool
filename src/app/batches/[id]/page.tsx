'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Badge from '@/components/Badge';

function fmt(n: any) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function BatchDetailPage() {
  const params = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [investors, setInvestors] = useState<any[]>([]);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ investorId: '', capitalAmount: '' });
  const [reportForm, setReportForm] = useState({ reportMonth: '', openingBalance: '', closingBalance: '', platformFeeRate: '0', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchBatch();
    fetch('/api/investors').then(r => r.json()).then(setInvestors);
  }, [params.id]);

  async function fetchBatch() {
    const r = await fetch(`/api/batches/${params.id}`);
    setBatch(await r.json());
  }

  async function enrollMember(e: any) {
    e.preventDefault();
    const r = await fetch('/api/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId: params.id, ...enrollForm }),
    });
    const d = await r.json();
    setMsg(r.ok ? 'Member enrolled!' : d.error);
    if (r.ok) { setShowEnroll(false); fetchBatch(); }
  }

  async function createReport(e: any) {
    e.preventDefault();
    const r = await fetch('/api/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId: params.id, ...reportForm }),
    });
    const d = await r.json();
    setMsg(r.ok ? 'Report created!' : d.error);
    if (r.ok) { setShowReport(false); fetchBatch(); }
  }

  async function runDistribution(reportId: string) {
    const r = await fetch('/api/distributions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId }),
    });
    const d = await r.json();
    setMsg(r.ok ? 'Distribution completed!' : d.error);
    if (r.ok) fetchBatch();
  }

  async function requestWithdrawal(memberId: string) {
    const r = await fetch(`/api/members/${memberId}/withdrawal-request`, { method: 'POST' });
    const d = await r.json();
    setMsg(r.ok ? 'Withdrawal requested.' : d.error);
    if (r.ok) fetchBatch();
  }

  if (!batch) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent)' }}>Loading...</div>
      </main>
    </div>
  );

  const totalCapital = batch.members.reduce((s: number, m: any) => s + parseFloat(m.capitalAmount), 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <a href="/batches" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>← All Batches</a>

        {msg && (
          <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13 }}>
            {msg} <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', float: 'right' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>{batch.batchCode}</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>{batch.name}</h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
              <Badge status={batch.status} />
              {batch.brokerName && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Broker: {batch.brokerName}</span>}
              {batch.tradingAccountId && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Account: {batch.tradingAccountId}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {batch.status === 'FORMING' && (
              <button onClick={() => setShowEnroll(!showEnroll)} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                + Enroll Member
              </button>
            )}
            {batch.status === 'ACTIVE' && (
              <button onClick={() => setShowReport(!showReport)} style={{ background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                + Monthly Report
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            ['Members', `${batch.members.length}/${batch.targetMembers}`],
            ['Total Capital', fmt(totalCapital)],
            ['Target Capital', fmt(batch.targetCapital)],
            ['Monthly Reports', batch.monthlyReports.length],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Enroll Form */}
        {showEnroll && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Enroll Investor</h3>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>INVESTOR</label>
                <select value={enrollForm.investorId} onChange={e => setEnrollForm(p => ({ ...p, investorId: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
                  <option value="">Select investor...</option>
                  {investors.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>{inv.fullName} — {inv.email}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>CAPITAL AMOUNT ($)</label>
                <input type="number" value={enrollForm.capitalAmount} onChange={e => setEnrollForm(p => ({ ...p, capitalAmount: e.target.value }))}
                  placeholder={batch.contributionPerMember}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
              </div>
              <button onClick={enrollMember} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '9px 20px', fontWeight: 700, cursor: 'pointer' }}>Enroll</button>
            </div>
          </div>
        )}

        {/* Monthly Report Form */}
        {showReport && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Monthly Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                ['Report Month', 'reportMonth', 'date'],
                ['Opening Balance ($)', 'openingBalance', 'number'],
                ['Closing Balance ($)', 'closingBalance', 'number'],
                ['Platform Fee Rate (0-1)', 'platformFeeRate', 'number'],
              ].map(([l, k, t]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>{l}</label>
                  <input type={t} step="any" value={(reportForm as any)[k]} onChange={e => setReportForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
              <textarea value={reportForm.notes} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13, resize: 'none' }} />
            </div>
            <button onClick={createReport} style={{ marginTop: 14, background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontWeight: 700, cursor: 'pointer' }}>Save Report</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
          {/* Members Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>Members</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Investor', 'Capital', 'Share %', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, color: 'var(--muted)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.members.map((m: any) => {
                  const pct = totalCapital > 0 ? ((parseFloat(m.capitalAmount) / totalCapital) * 100).toFixed(1) : '0';
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.investor.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.investor.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{fmt(m.capitalAmount)}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{pct}%</td>
                      <td style={{ padding: '12px 16px' }}><Badge status={m.status} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        {m.status === 'ACTIVE' && batch.status === 'ACTIVE' && (
                          <button onClick={() => requestWithdrawal(m.id)} style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 5, cursor: 'pointer' }}>
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Monthly Reports */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)' }}>Monthly Reports</h2>
            </div>
            {batch.monthlyReports.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No reports yet</div>
            )}
            {batch.monthlyReports.map((r: any) => (
              <div key={r.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(r.reportMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  {!r.distribution ? (
                    <button onClick={() => runDistribution(r.id)} style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', color: 'var(--accent)', borderRadius: 5, cursor: 'pointer' }}>
                      Distribute
                    </button>
                  ) : <span style={{ fontSize: 11, color: 'var(--accent)' }}>✓ Distributed</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--muted)' }}>Gross Profit: </span><span style={{ fontFamily: 'JetBrains Mono', color: parseFloat(r.grossProfit) >= 0 ? 'var(--accent)' : '#ef4444' }}>{fmt(r.grossProfit)}</span></div>
                  <div><span style={{ color: 'var(--muted)' }}>Net Profit: </span><span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)' }}>{fmt(r.netProfit)}</span></div>
                  <div><span style={{ color: 'var(--muted)' }}>Fee: </span><span style={{ fontFamily: 'JetBrains Mono' }}>{fmt(r.platformFee)}</span></div>
                  <div><span style={{ color: 'var(--muted)' }}>Fee Rate: </span><span style={{ fontFamily: 'JetBrains Mono' }}>{(parseFloat(r.platformFeeRate) * 100).toFixed(0)}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
