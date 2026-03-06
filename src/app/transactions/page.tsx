'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Badge from '@/components/Badge';

function fmt(n: any) {
  return '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    // We can fetch from dashboard recent + investors or build a dedicated route
    // For now fetch all via investors list
    fetch('/api/dashboard').then(r => r.json()).then(d => setTxns(d.recentTransactions || []));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, marginBottom: 4 }}>LEDGER</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>Transactions</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>Recent financial activity across all batches</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Reference', 'Investor', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 11, color: 'var(--muted)', textAlign: 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((tx: any) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 20px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--muted)' }}>{tx.reference || tx.id.slice(0, 12)}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 500 }}>{tx.investor?.fullName}</td>
                  <td style={{ padding: '13px 20px' }}><Badge status={tx.type} /></td>
                  <td style={{ padding: '13px 20px', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: tx.type === 'WITHDRAWAL' ? '#ef4444' : 'var(--accent)' }}>
                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)}
                  </td>
                  <td style={{ padding: '13px 20px' }}><Badge status={tx.status} /></td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {txns.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No transactions yet</div>
          )}
        </div>
      </main>
    </div>
  );
}
