//src/app/investors/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Badge from '@/components/Badge';

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', nationalId: '', bankName: '', bankAccount: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchInvestors(); }, []);
  async function fetchInvestors() {
    const r = await fetch('/api/investors');
    setInvestors(await r.json());
  }

  async function createInvestor(e: any) {
    e.preventDefault(); setError('');
    const r = await fetch('/api/investors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) return setError(d.error);
    setShowForm(false);
    setForm({ fullName: '', email: '', phone: '', nationalId: '', bankName: '', bankAccount: '' });
    fetchInvestors();
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>REGISTRY</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Investors</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 16 }}>{investors.length} registered investors</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            + Add Investor
          </button>
        </div>

        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Register New Investor</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 15 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[['Full Name *', 'fullName'], ['Email *', 'email'], ['Phone', 'phone'], ['National ID', 'nationalId'], ['Bank Name', 'bankName'], ['Bank Account', 'bankAccount']].map(([l, k]) => (
                <div key={k}>
                  <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{l}</label>
                  <input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 15 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button onClick={createInvestor} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Save Investor</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Investor', 'Contact', 'Bank', 'Batches', 'Transactions'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investors.map((inv: any) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{inv.fullName}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>ID: {inv.id.slice(0, 8)}...</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 15 }}>{inv.email}</div>
                    {inv.phone && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{inv.phone}</div>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 15 }}>{inv.bankName || '—'}</div>
                    {inv.bankAccount && <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{inv.bankAccount}</div>}
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600 }}>
                    {inv._count?.memberships ?? 0}
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono', fontSize: 16 }}>
                    {inv._count?.transactions ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {investors.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', fontSize: 16 }}>
              No investors registered yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
