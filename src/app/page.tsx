'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type ModalType = 'terms' | 'privacy' | 'contact' | null

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<ModalType>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setActiveStep(p => (p + 1) % 6), 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (modal) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [modal])

  const steps = [
    { num: '01', title: 'Register & Verify', desc: 'Create your account, verify your email and complete KYC identity verification.', icon: '◎' },
    { num: '02', title: 'Join a Batch', desc: 'Select an open batch pool that matches your contribution level and join.', icon: '⬡' },
    { num: '03', title: 'Pool Completes', desc: 'Once the batch target is reached, funds are deployed to a dedicated forex trading account.', icon: '◈' },
    { num: '04', title: 'Monitor Trading', desc: 'Receive MT4 investor login to monitor live trading activity in real time.', icon: '◉' },
    { num: '05', title: 'Monthly Reports', desc: 'Receive transparent profit reports showing pool performance and your individual share.', icon: '⊞' },
    { num: '06', title: 'Withdraw & Repeat', desc: 'Withdraw profits or full capital at month-end, or continue into the next cycle.', icon: '⟁' },
  ]

  const pools = [
    { size: '$100', desc: 'Entry Pool', members: '10', color: '#c9a84c' },
    { size: '$500', desc: 'Standard Pool', members: '10', color: '#00d4aa' },
    { size: '$5,000', desc: 'Advanced Pool', members: '10', color: '#818cf8' },
    { size: '$10,000', desc: 'Elite Pool', members: '10', color: '#f472b6' },
  ]

  const features = [
    { icon: '⊡', title: '50% Equity Hard Cap', desc: 'Strict drawdown protection limits risk to 50% of pool equity — your capital is always protected first.' },
    { icon: '◎', title: 'MT4 Investor Access', desc: 'Full read-only access to the live trading account. Watch every trade in real time with complete transparency.' },
    { icon: '⬡', title: 'Proportional Profits', desc: 'Profits distributed fairly based on your contribution share. The more you contribute, the more you earn.' },
    { icon: '◈', title: 'Monthly Flexibility', desc: 'Withdraw profits, full capital, or roll into the next cycle — no lock-ins, no penalties, ever.' },
    { icon: '◉', title: 'KYC Verified Members', desc: 'All participants are identity-verified ensuring a secure, accountable and trustworthy community.' },
    { icon: '⊞', title: 'Collective Strength', desc: 'Smaller contributions combined into larger trading equity — access institutional-level positions together.' },
  ]

  return (
    <div style={{ background: '#06080d', color: '#e2e8f0', fontFamily: "'Syne', 'Georgia', serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(201,168,76,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #06080d; }
        ::-webkit-scrollbar-thumb { background: #c9a84c; border-radius: 2px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg); } 33% { transform: translateY(-12px) rotate(1deg); } 66% { transform: translateY(-6px) rotate(-1deg); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        .fade-up { animation: fadeUp 0.8s ease forwards; }
        .float { animation: float 6s ease-in-out infinite; }
        .hover-glow { transition: all 0.3s ease; }
        .hover-glow:hover { box-shadow: 0 0 30px rgba(201,168,76,0.2); transform: translateY(-4px); }
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #c9a84c !important; }
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-flex; animation: ticker 30s linear infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #c9a84c 0%, #f0d080 40%, #c9a84c 60%, #a07830 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .grid-bg {
          background-image: linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .step-card { transition: all 0.4s ease; }
        .step-card.active { border-color: rgba(201,168,76,0.4) !important; background: rgba(201,168,76,0.05) !important; }
        .pool-card { transition: all 0.3s ease; cursor: default; }
        .pool-card:hover { transform: scale(1.03); }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { border-color: rgba(201,168,76,0.3) !important; background: rgba(201,168,76,0.03) !important; }
        .cta-btn { position: relative; overflow: hidden; transition: all 0.3s ease; }
        .cta-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); transition: left 0.5s ease; }
        .cta-btn:hover::before { left: 100%; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(201,168,76,0.4); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: #0d1117; border: 1px solid rgba(201,168,76,0.2); border-radius: 20px; max-width: 640px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; animation: modalIn 0.3s ease; }
        .modal-body { overflow-y: auto; padding: 28px 32px; flex: 1; }
        .modal-body::-webkit-scrollbar { width: 4px; }
        .modal-body::-webkit-scrollbar-thumb { background: #c9a84c33; border-radius: 2px; }

        /* MOBILE */
        @media (max-width: 768px) {
          .hero-title { font-size: 42px !important; letter-spacing: -1px !important; }
          .hero-sub { font-size: 15px !important; }
          .hide-mobile { display: none !important; }
          .pools-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .what-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 24px !important; }
          .footer-links { flex-wrap: wrap !important; gap: 16px !important; }
          .stats-bar { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .hero-btns a { text-align: center !important; justify-content: center !important; }
          .cta-btns { flex-direction: column !important; align-items: stretch !important; }
          .cta-btns a { text-align: center !important; }
          .nav-wrap { padding: 0 20px !important; }
          .section-pad { padding: 64px 20px !important; }
          .hero-section { padding-top: 130px !important; padding-bottom: 60px !important; padding-left: 20px !important; padding-right: 20px !important; }
          .float-orb { display: none !important; }
          .modal-body { padding: 20px !important; }
          .sim-card { padding: 20px !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 34px !important; }
          .pools-grid { grid-template-columns: 1fr !important; }
          .section-heading { font-size: 34px !important; }
          .cta-heading { font-size: 36px !important; }
        }
      `}</style>

      {/* MODALS */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal-box">
            <div style={{ padding: '24px 32px 0', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                  {modal === 'terms' ? 'LEGAL' : modal === 'privacy' ? 'LEGAL' : 'SUPPORT'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {modal === 'terms' ? 'Terms & Conditions' : modal === 'privacy' ? 'Privacy Policy' : 'Contact Support'}
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div className="modal-body">
              {modal === 'terms' && <TermsContent />}
              {modal === 'privacy' && <PrivacyContent />}
              {modal === 'contact' && <ContactContent />}
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? 'rgba(6,8,13,0.95)' : 'transparent',
        backdropFilter: scrollY > 60 ? 'blur(20px)' : 'none',
        borderBottom: scrollY > 60 ? '1px solid rgba(201,168,76,0.1)' : 'none',
        transition: 'all 0.4s ease',
      }}>
        <div className="nav-wrap" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, padding: '0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="Nova-Lite" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling!.removeAttribute('style') }} />
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#c9a84c,#8b5e1a)', display: 'none', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff' }}>C</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>NOVA-LITE</div>
              <div style={{ fontSize: 10, color: '#c9a84c', letterSpacing: 3, marginTop: -2 }}>CLUB10 POOL</div>
            </div>
          </div>

          <div className="hide-mobile" style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
            {['How It Works', 'Pool Sizes', 'Features', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="nav-link" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', letterSpacing: 0.5 }}>{item}</a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/login" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', padding: '8px 18px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, transition: 'all 0.2s' }} className="nav-link hide-mobile">Sign In</Link>
            <Link href="/login" className="cta-btn" style={{ fontSize: 13, fontWeight: 700, color: '#000', background: 'linear-gradient(135deg,#c9a84c,#a07830)', padding: '8px 20px', borderRadius: 8, textDecoration: 'none', display: 'block' }}>Join Pool</Link>
            <button className="hide-desktop" onClick={() => setMenuOpen(p => !p)} style={{ display: 'none', background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c', borderRadius: 8, width: 38, height: 38, cursor: 'pointer', fontSize: 18, alignItems: 'center', justifyContent: 'center' }}>☰</button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: 'rgba(6,8,13,0.98)', borderTop: '1px solid rgba(201,168,76,0.1)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['How It Works', 'Pool Sizes', 'Features', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none', padding: '10px 12px', borderRadius: 8, display: 'block' }}>{item}</a>
            ))}
            <Link href="/login" style={{ fontSize: 14, color: '#94a3b8', padding: '10px 12px', textDecoration: 'none', display: 'block' }}>Sign In</Link>
          </div>
        )}
      </nav>

      {/* TICKER */}
      <div style={{ position: 'fixed', top: 72, left: 0, right: 0, zIndex: 99, background: 'rgba(201,168,76,0.06)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '6px 0', overflow: 'hidden' }}>
        <div className="ticker-inner" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#c9a84c', letterSpacing: 1 }}>
          {Array(4).fill(null).map((_, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 60, paddingRight: 60 }}>
              <span>EUR/USD +0.42%</span><span>•</span><span>GBP/USD +0.18%</span><span>•</span>
              <span>USD/JPY -0.31%</span><span>•</span><span>XAU/USD +1.24%</span><span>•</span>
              <span>BTC/USD +2.87%</span><span>•</span><span>50% EQUITY PROTECTION ACTIVE</span><span>•</span>
              <span>TRANSPARENT MT4 ACCESS</span><span>•</span><span>MONTHLY WITHDRAWALS OPEN</span><span>•</span>
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="grid-bg hero-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,212,170,0.04) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div className="float float-orb" style={{ position: 'absolute', top: '30%', right: '15%', width: 120, height: 120, border: '1px solid rgba(201,168,76,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 80, height: 80, border: '1px solid rgba(201,168,76,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, background: 'radial-gradient(circle, #c9a84c, #8b5e1a)', borderRadius: '50%' }} />
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
          <div className="fade-up" style={{ animationDelay: '0.1s', opacity: 0, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, background: '#00d4aa', borderRadius: '50%', boxShadow: '0 0 8px #00d4aa' }} />
            <span style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace" }}>COMMUNITY FOREX POOL — EST. NIGERIA</span>
          </div>

          <h1 className="hero-title fade-up" style={{ animationDelay: '0.2s', opacity: 0, fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginBottom: 24, letterSpacing: -2 }}>
            <span style={{ display: 'block', color: '#e2e8f0' }}>Trade Bigger.</span>
            <span className="shimmer-text" style={{ display: 'block', fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic' }}>Together.</span>
          </h1>

          <p className="hero-sub fade-up" style={{ animationDelay: '0.3s', opacity: 0, fontSize: 18, color: '#94a3b8', lineHeight: 1.7, maxWidth: 620, margin: '0 auto 48px', fontWeight: 400 }}>
            Nova-Lite Club10 Pool combines smaller contributions into powerful forex trading capital — giving every member institutional-level market access with complete transparency.
          </p>

          <div className="fade-up hero-btns" style={{ animationDelay: '0.4s', opacity: 0, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="cta-btn" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', fontWeight: 800, fontSize: 15, padding: '16px 36px', borderRadius: 12, textDecoration: 'none', letterSpacing: 0.5 }}>
              Start Investing →
            </Link>
            <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.2)', color: '#94a3b8', fontSize: 14, padding: '16px 28px', borderRadius: 12, textDecoration: 'none', transition: 'all 0.2s' }} className="nav-link">
              How It Works ↓
            </a>
          </div>

          <div className="fade-up stats-bar" style={{ animationDelay: '0.6s', opacity: 0, marginTop: 72, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(201,168,76,0.1)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)' }}>
            {[
              { val: '50%', label: 'Max Equity Drawdown Cap' },
              { val: '100%', label: 'Profit Transparency' },
              { val: '0', label: 'Withdrawal Penalties' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(6,8,13,0.8)', padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS IT */}
      <section className="section-pad" style={{ padding: '100px 40px', background: '#080b12' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="what-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>WHAT IS CLUB10 POOL</div>
              <h2 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: -1 }}>
                Collective Equity.<br />
                <span style={{ color: '#c9a84c' }}>Individual Gains.</span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>
                Nova-Lite Club10 Pool is a transparent, community-driven capital pooling system designed to build sustainable trading equity in the forex market through collaboration, discipline, and integrity.
              </p>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
                Instead of trading alone with limited capital, members combine smaller contributions into a single, powerful trading account — unlocking access to stronger positions while sharing profits proportionally and fairly.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Built on complete financial transparency', 'Every member monitors trades in real time', 'Profits distributed by contribution share', 'Strict 50% equity protection enforced'].map(point => (
                  <div key={point} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#00d4aa', flexShrink: 0 }}>✓</div>
                    <span style={{ fontSize: 14, color: '#94a3b8' }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sim-card" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(0,212,170,0.04))', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 20, padding: 36 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#c9a84c', marginBottom: 20, letterSpacing: 2 }}>LIVE POOL SIMULATION</div>
              {[
                { member: 'Member A', amount: '$1,000', share: '20%', profit: '+$48.20' },
                { member: 'Member B', amount: '$2,500', share: '50%', profit: '+$120.50' },
                { member: 'Member C', amount: '$1,500', share: '30%', profit: '+$72.30' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid rgba(201,168,76,0.08)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `rgba(201,168,76,${0.2 + i * 0.1})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#c9a84c', flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.member}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{m.amount} · {m.share}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#00d4aa', fontFamily: "'JetBrains Mono', monospace" }}>{m.profit}</div>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(201,168,76,0.06)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Total Pool Profit (Month)</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace" }}>+$241.00 (+4.82%)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section-pad grid-bg" style={{ padding: '100px 40px', background: '#06080d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>THE PROCESS</div>
            <h2 className="section-heading" style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>How It Works</h2>
            <p style={{ color: '#64748b', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>Six simple steps from registration to profit withdrawal.</p>
          </div>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {steps.map((step, i) => (
              <div key={i} className={`step-card ${activeStep === i ? 'active' : ''}`} style={{ background: '#080b12', border: '1px solid rgba(201,168,76,0.08)', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 20, right: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(201,168,76,0.3)', fontWeight: 700 }}>{step.num}</div>
                <div style={{ fontSize: 28, marginBottom: 16, color: activeStep === i ? '#c9a84c' : '#475569' }}>{step.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: activeStep === i ? '#e2e8f0' : '#94a3b8' }}>{step.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{step.desc}</div>
                {activeStep === i && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #c9a84c, #a07830)' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POOL SIZES */}
      <section id="pool-sizes" className="section-pad" style={{ padding: '100px 40px', background: '#080b12' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>AVAILABLE POOLS</div>
            <h2 className="section-heading" style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>Choose Your Pool</h2>
            <p style={{ color: '#64748b', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>Join the pool that matches your investment level. All pools operate under the same transparent rules.</p>
          </div>
          <div className="pools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {pools.map((pool, i) => (
              <div key={i} className="pool-card hover-lift" style={{ background: '#06080d', border: `1px solid ${pool.color}22`, borderRadius: 20, padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${pool.color}, transparent)` }} />
                <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 3, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>{pool.desc.toUpperCase()}</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: pool.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, letterSpacing: -2 }}>{pool.size}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Target pool size</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                  {['Up to 10 members', 'Proportional profits', 'MT4 investor access', 'Monthly withdrawal'].map(f => (
                    <div key={f} style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <span style={{ color: pool.color, fontSize: 10 }}>◆</span> {f}
                    </div>
                  ))}
                </div>
                <Link href="/login" style={{ display: 'block', background: `${pool.color}15`, border: `1px solid ${pool.color}33`, color: pool.color, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' }}>
                  Join This Pool →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section-pad grid-bg" style={{ padding: '100px 40px', background: '#06080d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>WHY CLUB10 POOL</div>
            <h2 className="section-heading" style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>Built on Transparency</h2>
            <p style={{ color: '#64748b', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>Every feature exists to protect members and ensure a fair, accountable system.</p>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} className="feature-card" style={{ background: '#080b12', border: '1px solid rgba(201,168,76,0.06)', borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 16, color: '#c9a84c' }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section-pad" style={{ padding: '100px 40px', background: '#080b12' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>COMMON QUESTIONS</div>
            <h2 className="section-heading" style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>FAQ</h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="section-pad" style={{ padding: '100px 40px', background: 'linear-gradient(135deg, #0a0c10, #0d1117)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 4, marginBottom: 20, fontFamily: "'JetBrains Mono', monospace" }}>JOIN THE POOL TODAY</div>
          <h2 className="cta-heading" style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1, marginBottom: 20, lineHeight: 1.1 }}>
            Ready to Trade<br />
            <span style={{ color: '#c9a84c', fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic' }}>Bigger Together?</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
            Register, verify your identity, and join a batch pool. Complete transparency, proportional profits, and monthly withdrawal flexibility await.
          </p>
          <div className="cta-btns" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className="cta-btn" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', fontWeight: 800, fontSize: 16, padding: '18px 44px', borderRadius: 12, textDecoration: 'none' }}>
              Create Account →
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(201,168,76,0.2)', color: '#94a3b8', fontSize: 14, padding: '18px 32px', borderRadius: 12, textDecoration: 'none' }}>
              Sign In Instead
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#040609', borderTop: '1px solid rgba(201,168,76,0.08)', padding: '48px 40px' }}>
        <div className="footer-inner" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <img src="/logo.png" alt="Nova-Lite" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Nova-Lite Club10 Pool</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>Built on Transparency. Driven by Integrity.</div>
          </div>
          <div className="footer-links" style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Privacy Policy', key: 'privacy' as ModalType },
              { label: 'Terms & Conditions', key: 'terms' as ModalType },
              { label: 'Contact Support', key: 'contact' as ModalType },
            ].map(link => (
              <button key={link.label} onClick={() => setModal(link.key)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#475569', cursor: 'pointer', padding: 0, transition: 'color 0.2s', fontFamily: 'inherit' }} className="nav-link">{link.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
            © 2025 Nova-Lite Ltd. All rights reserved.
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '24px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: '#334155', lineHeight: 1.7 }}>
          ⚠ Risk Disclaimer: Forex trading involves substantial risk of loss. Past performance is not indicative of future results. Nova-Lite Club10 Pool is a community investment vehicle — profits are not guaranteed. Only invest what you can afford to lose.
        </div>
      </footer>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  const faqs = [
    { q: 'What is Nova-Lite Club10 Pool?', a: 'A community-driven forex trading pool where members combine contributions into a shared trading account. Combined equity enables stronger market positions while profits are distributed proportionally to each member.' },
    { q: 'How do I join a batch pool?', a: 'Register an account, verify your email, complete KYC identity verification, then select an available batch pool to join. Once a batch reaches its target, it closes and trading begins.' },
    { q: 'How are profits distributed?', a: 'Profits are distributed proportionally based on your contribution share of the total pool. If you contributed 10% of the pool and the pool earned $1,000, your share is $100.' },
    { q: 'Can I monitor the trading activity?', a: 'Yes. Once a batch is activated, all members receive MT4 investor login credentials — read-only access to monitor every trade in real time without affecting operations.' },
    { q: 'What is the 50% equity hard cap?', a: 'A strict risk management rule that limits total drawdown to 50% of pool equity. This protects all members\' capital by preventing excessive losses during adverse market conditions.' },
    { q: 'When can I withdraw my funds?', a: 'Members may request withdrawals at the end of any trading month with zero penalties. You can withdraw profits only, your full contribution, or choose to roll over into the next cycle.' },
    { q: 'Is forex trading risky?', a: 'Yes. Forex trading involves substantial risk and profits are not guaranteed. Nova-Lite enforces strict risk management including the 50% equity protection cap, but losses are possible.' },
    { q: 'Can I join multiple batches?', a: 'Yes. Members may participate in multiple batches depending on availability, allowing you to diversify participation across different pool cycles and sizes.' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {faqs.map((faq, i) => (
        <div key={i} style={{ background: '#06080d', border: `1px solid ${open === i ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.06)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.3s' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: open === i ? '#c9a84c' : '#e2e8f0' }}>{faq.q}</span>
            <span style={{ color: '#c9a84c', fontSize: 18, flexShrink: 0, marginLeft: 12, transition: 'transform 0.3s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
          </button>
          {open === i && <div style={{ padding: '0 24px 18px', fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{faq.a}</div>}
        </div>
      ))}
    </div>
  )
}

// ── MODAL CONTENTS ────────────────────────────────────────
function TermsContent() {
  const s = { h2: { fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 8, marginTop: 24 } as React.CSSProperties, p: { fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties }
  return (
    <div>
      <p style={{ ...s.p, color: '#64748b', fontSize: 12 }}>Last updated: January 2025</p>
      <p style={s.p}>By registering and using Nova-Lite Club10 Pool ("the Platform"), you agree to be bound by these Terms and Conditions. Please read them carefully before proceeding.</p>

      <h2 style={s.h2}>1. Eligibility</h2>
      <p style={s.p}>You must be at least 18 years of age and legally permitted to participate in investment activities in your jurisdiction. By registering, you confirm that your participation is lawful in your country of residence.</p>

      <h2 style={s.h2}>2. KYC Verification</h2>
      <p style={s.p}>All members are required to complete identity verification (KYC) before participating in any pool. Providing false or misleading information during KYC is grounds for immediate account termination and potential legal action.</p>

      <h2 style={s.h2}>3. Investment Risk</h2>
      <p style={s.p}>Forex trading involves substantial risk of loss. Past performance of any pool does not guarantee future results. You may lose some or all of your capital contribution. Only participate with funds you can afford to lose entirely.</p>

      <h2 style={s.h2}>4. Pool Participation</h2>
      <p style={s.p}>Once a batch pool reaches its target and trading begins, contributions are deployed to a live forex trading account. You will receive read-only MT4 investor access to monitor trading activity. You may not interfere with or instruct trading operations.</p>

      <h2 style={s.h2}>5. Profit Distribution</h2>
      <p style={s.p}>Profits are distributed proportionally based on your capital contribution as a percentage of the total pool. Distributions are processed at month-end following the receipt of a verified monthly report. Nova-Lite reserves the right to withhold distributions pending any dispute resolution.</p>

      <h2 style={s.h2}>6. Withdrawals</h2>
      <p style={s.p}>Members may request withdrawal of profits or full capital at month-end with no penalty. Withdrawals are processed to the bank account registered on your profile. Nova-Lite is not responsible for delays caused by banking intermediaries.</p>

      <h2 style={s.h2}>7. 50% Equity Protection</h2>
      <p style={s.p}>A strict 50% equity drawdown cap is enforced on all pools. Trading is suspended if total pool equity falls to 50% of its starting value. This is a protection mechanism, not a guarantee against losses below this threshold in extreme market conditions.</p>

      <h2 style={s.h2}>8. Account Termination</h2>
      <p style={s.p}>Nova-Lite reserves the right to suspend or permanently terminate accounts that violate these terms, engage in fraudulent activity, or act in bad faith against other pool members or the integrity of the platform.</p>

      <h2 style={s.h2}>9. Limitation of Liability</h2>
      <p style={s.p}>Nova-Lite Ltd shall not be liable for trading losses, market disruptions, or force majeure events. Our liability is limited to the administrative handling of contributions and distributions in accordance with these terms.</p>

      <h2 style={s.h2}>10. Governing Law</h2>
      <p style={s.p}>These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through good-faith negotiation, and where necessary, through appropriate Nigerian legal channels.</p>

      <h2 style={s.h2}>11. Amendments</h2>
      <p style={s.p}>Nova-Lite reserves the right to amend these Terms at any time. Continued use of the Platform following notification of changes constitutes acceptance of the revised Terms.</p>

      <p style={{ ...s.p, marginTop: 24, color: '#64748b', fontSize: 12 }}>For questions regarding these Terms, contact us at nova.liteltd@gmail.com</p>
    </div>
  )
}

function PrivacyContent() {
  const s = { h2: { fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 8, marginTop: 24 } as React.CSSProperties, p: { fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties }
  return (
    <div>
      <p style={{ ...s.p, color: '#64748b', fontSize: 12 }}>Last updated: January 2025</p>
      <p style={s.p}>Nova-Lite Ltd ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the Club10 Pool platform.</p>

      <h2 style={s.h2}>1. Information We Collect</h2>
      <p style={s.p}>We collect information you provide directly: full name, email address, phone number, government-issued identity documents (for KYC), bank account details, and profile photographs. We also collect usage data such as login activity, IP addresses, and browser type for security purposes.</p>

      <h2 style={s.h2}>2. How We Use Your Information</h2>
      <p style={s.p}>Your data is used to: verify your identity and comply with KYC obligations, manage your pool membership and profit distributions, process withdrawals to your registered bank account, send transactional notifications and monthly reports, and maintain the security and integrity of the platform.</p>

      <h2 style={s.h2}>3. KYC Document Storage</h2>
      <p style={s.p}>Identity documents submitted during KYC verification are stored securely in encrypted cloud storage. Documents are accessible only to authorised Nova-Lite administrators for verification purposes. We do not sell, share, or transfer your identity documents to third parties.</p>

      <h2 style={s.h2}>4. Data Sharing</h2>
      <p style={s.p}>We do not sell your personal data. We may share data with: our technology service providers (hosting, database, email) strictly for operational purposes under confidentiality agreements, and regulatory or law enforcement authorities where required by Nigerian law.</p>

      <h2 style={s.h2}>5. Data Retention</h2>
      <p style={s.p}>We retain your personal data for as long as your account is active and for a minimum of 5 years after account closure, in compliance with financial record-keeping obligations under Nigerian law.</p>

      <h2 style={s.h2}>6. Data Security</h2>
      <p style={s.p}>We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), bcrypt password hashing, access controls, and regular security reviews. No system is 100% secure — we encourage strong passwords and caution against sharing login credentials.</p>

      <h2 style={s.h2}>7. Your Rights</h2>
      <p style={s.p}>You have the right to request access to your personal data, request correction of inaccurate information, request deletion of your account and associated data (subject to legal retention obligations), and withdraw consent for marketing communications at any time.</p>

      <h2 style={s.h2}>8. Cookies</h2>
      <p style={s.p}>We use essential cookies and local storage tokens for authentication and session management. We do not use third-party advertising or tracking cookies.</p>

      <h2 style={s.h2}>9. Children's Privacy</h2>
      <p style={s.p}>The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal data from minors.</p>

      <h2 style={s.h2}>10. Contact</h2>
      <p style={s.p}>For privacy-related inquiries or to exercise your data rights, contact our team at nova.liteltd@gmail.com. We aim to respond within 5 business days.</p>
    </div>
  )
}

function ContactContent() {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 28 }}>
        Our support team is available to assist you with account questions, KYC issues, withdrawal inquiries, and general platform guidance.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          {
            icon: '✉',
            label: 'Email',
            value: 'nova.liteltd@gmail.com',
            sub: 'Best for detailed inquiries. We respond within 24 hours.',
            href: 'mailto:nova.liteltd@gmail.com',
            color: '#00d4aa',
          },
          {
            icon: '✈',
            label: 'Telegram',
            value: '@novalitesignal',
            sub: 'Join our Telegram channel for updates and announcements.',
            href: 'https://t.me/novalitesignal',
            color: '#818cf8',
          },
          {
            icon: '☎',
            label: 'Phone / WhatsApp',
            value: '+234 703 092 3585',
            sub: '+234 814 424 1060',
            href: 'tel:+2347030923585',
            color: '#c9a84c',
          },
        ].map(item => (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: '#080b12', border: `1px solid ${item.color}22`, borderRadius: 12, padding: '18px 20px', textDecoration: 'none', transition: 'border-color 0.2s' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{item.label.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{item.sub}</div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '14px 16px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
          🕐 <strong style={{ color: '#94a3b8' }}>Support hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM (WAT). We aim to respond to all inquiries within one business day.
        </div>
      </div>
    </div>
  )
}
