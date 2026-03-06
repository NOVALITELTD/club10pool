'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Badge from '@/components/Badge';

function fmt(n: any) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchCode: '', name: '', targetMembers: '10', contributionPerMember: '100', brokerName: '', tradingAccountId: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchBatches(); }, []);

  async function fetchBatches() {
    const r = await fetch('/api/batches');
    setBatches(await r.json());
  }

  async function createBatch(e: any) {
    e.preventDefault(); setError('');
    const r = await fetch('/api/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) return setError(d.error);
    setShowForm(false);
    setForm({ batchCode: '', name: '', targetMembers: '10', contributionPerMember: '100', brokerName: '', tradingAccountId: '', startDate: '', endDate: '' });
    fetchBatches();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/batches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchBatches();
  }

  const statusFlow: Record<string, string[]> = {
    FORMING: ['ACTIVE', 'CLOSED'],
    ACTIVE: ['DISTRIBUTING', 'CLOSED'],
    DISTRIBUTING: ['ACTIVE', 'CLOSED'],
    CLOSED: [],
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>MANAGEMENT</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Batches</h1>
            <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>Create and manage investment pool batches</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>
            + New Batch
          </button>
        </div>

        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Create New Batch</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                ['Batch Code', 'batchCode', 'e.g. BATCH-A'],
                ['Name', 'name', 'e.g. Batch Alpha'],
                ['Broker Name', 'brokerName', 'e.g. Exness'],
                ['Trading Account ID', 'tradingAccountId', 'Account number'],
                ['Target Members', 'targetMembers', '10'],
                ['Capital Per Member ($)', 'contributionPerMember', '100'],
                ['Start Date', 'startDate', ''],
                ['End Date', 'endDate', ''],
              ].map(([label, key, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
                  <input
                    type={key.includes('Date') ? 'date' : 'text'}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button onClick={createBatch} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 6, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Create Batch</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {batches.map(b => (
            <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }} className="fade-in">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 4 }}>{b.batchCode}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{b.name}</div>
                  {b.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{b.description}</div>}
                </div>
                <Badge status={b.status} />
              </div>
              <div style={{ padding: '16px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Members</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700 }}>
                      {b._count.members}<span style={{ color: 'var(--muted)', fontSize: 13 }}>/{b.targetMembers}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Capital/Member</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700 }}>{fmt(b.contributionPerMember)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Target Capital</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{fmt(b.targetCapital)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Broker</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{b.brokerName || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(statusFlow[b.status] || []).map(s => (
                    <button key={s} onClick={() => updateStatus(b.id, s)} style={{
                      fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                      background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)'
                    }}>
                      → {s}
                    </button>
                  ))}
                  <a href={`/batches/${b.id}`} style={{
                    fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                    color: 'var(--accent)', textDecoration: 'none'
                  }}>
                    View Details →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        {batches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
            <div style={{ fontSize: 16 }}>No batches yet. Create your first batch to get started.</div>
          </div>
        )}
      </main>
    </div>
  );
}
