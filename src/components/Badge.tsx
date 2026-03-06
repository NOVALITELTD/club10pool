const colors: Record<string, { bg: string; color: string; border: string }> = {
  FORMING:    { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
  ACTIVE:     { bg: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: 'rgba(0,212,170,0.3)' },
  DISTRIBUTING: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  CLOSED:     { bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },
  WITHDRAWAL_REQUESTED: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  WITHDRAWN:  { bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },
  PENDING:    { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  CONFIRMED:  { bg: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: 'rgba(0,212,170,0.3)' },
  DEPOSIT:    { bg: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: 'rgba(0,212,170,0.3)' },
  PROFIT_SHARE: { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
  WITHDRAWAL: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

export default function Badge({ status }: { status: string }) {
  const c = colors[status] ?? colors['PENDING'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11,
      fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
