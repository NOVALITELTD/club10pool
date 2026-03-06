
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', icon: '◈', label: 'Dashboard' },
  { href: '/batches', icon: '◉', label: 'Batches' },
  { href: '/investors', icon: '◎', label: 'Investors' },
  { href: '/transactions', icon: '◆', label: 'Transactions' },
  { href: '/reports', icon: '◇', label: 'Reports' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: 'var(--bg2)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
    }}>
      <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 3, fontWeight: 600, marginBottom: 4 }}>CLUB10</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Pool Manager</div>
        <div style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
          borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--accent)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} className="glow-active" />
          System Online
        </div>
      </div>
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {nav.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 8, marginBottom: 4, textDecoration: 'none',
              color: active ? 'var(--accent)' : 'var(--muted)',
              background: active ? 'rgba(0,212,170,0.08)' : 'transparent',
              borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
              fontSize: 14, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
        v1.0.0 · Club10 Pool
      </div>
    </aside>
  );
}
