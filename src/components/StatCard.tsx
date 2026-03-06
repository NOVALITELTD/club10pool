interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export default function StatCard({ label, value, sub, color = 'var(--accent)', icon }: Props) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '20px 24px', position: 'relative', overflow: 'hidden',
    }} className="fade-in">
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: -1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
