'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

function fmt(n: any) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>ANALYTICS</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Monthly Reports</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>Performance reports across all batches</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {reports.map((r: any) => {
            const profit = parseFloat(r.netProfit);
            const isPos = profit >= 0;
            return (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }} className="fade-in">
                <div style={{ height: 3, background: isPos ? 'var(--accent)' : '#ef4444' }} />
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, letterSpacing: 1 }}>{r.batch?.batchCode}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {new Date(r.reportMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>NET PROFIT</div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono', color: isPos ? 'var(--accent)' : '#ef4444' }}>
                        {isPos ? '+' : ''}{fmt(r.netProfit)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                    {[
                      ['Opening', fmt(r.openingBalance)],
                      ['Closing', fmt(r.closingBalance)],
                      ['Gross Profit', fmt(r.grossProfit)],
                      ['Platform Fee', fmt(r.platformFee)],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ color: 'var(--muted)', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {r.notes && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{r.notes}</div>}
                  <div style={{ marginTop: 12, fontSize: 11, color: r.distribution ? 'var(--accent)' : 'var(--gold)' }}>
                    {r.distribution ? '✓ Profit distributed' : '⏳ Awaiting distribution'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◇</div>
            <div>No reports yet. Reports are created inside each active batch.</div>
          </div>
        )}
      </main>
    </div>
  );
}
