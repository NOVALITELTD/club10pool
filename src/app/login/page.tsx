'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tab = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Login failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      const user = d.data.member
      if (user.isAdmin) { router.push('/admin'); return }
      if (user.emailVerified === false) return setError('Please verify your email before logging in')
      if (user.kycStatus === 'NOT_SUBMITTED') { router.push('/kyc'); return }
      if (user.kycStatus === 'PENDING') return setSuccess('Your KYC documents are under review. You will be notified by email once approved.')
      if (user.kycStatus === 'REJECTED') return setError('Your KYC was rejected. Please check email for reason / re-upload with the right documents / contact support at nova.liteltd@gmail.com for assistance.')
      router.push('/dashboard')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  async function handleRegister(e: any) {
    e.preventDefault()
    setError('')
    if (!agreedToTerms) return setError('You must agree to the Terms & Conditions to register')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error || 'Registration failed')
      localStorage.setItem('token', d.data.token)
      localStorage.setItem('user', JSON.stringify(d.data.member))
      setSuccess('Account created! Please check your email to verify your account.')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  async function handleForgot(e: any) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)
      setSuccess('If that email exists, a reset link has been sent.')
    } catch { setError('Server error') } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)',
    borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 14,
    boxSizing: 'border-box' as const, outline: 'none', transition: 'border-color 0.2s',
    fontFamily: "'Syne', Georgia, serif",
  }
  const labelStyle = {
    fontSize: 10, color: '#64748b', display: 'block',
    marginBottom: 7, letterSpacing: 1.5, textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', monospace",
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #06080d; }
        input:focus { border-color: rgba(201,168,76,0.4) !important; }
        input::placeholder { color: #334155; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        .modal-in { animation: modalIn 0.3s ease forwards; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #c9a84c; border-radius: 2px; }
        .terms-link { color: #c9a84c; text-decoration: underline; cursor: pointer; background: none; border: none; font-size: 13px; font-family: 'Syne', Georgia, serif; padding: 0; }
        .terms-link:hover { color: #f0d080; }
        .checkbox-wrap { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
        .custom-checkbox { width: 18px; height: 18px; border: 1.5px solid rgba(201,168,76,0.3); border-radius: 4px; background: transparent; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.2s; cursor: pointer; }
        .custom-checkbox.checked { background: #c9a84c; border-color: #c9a84c; }

        .left-panel { display: flex !important; }
        .mobile-logo { display: none !important; }

        @media (max-width: 768px) {
          .left-panel { display: none !important; }
          .right-panel {
            width: 100% !important;
            padding: 40px 24px !important;
            min-height: 100vh;
          }
          .mobile-logo { display: flex !important; }
          .login-root { flex-direction: column !important; }
        }
      `}</style>

      <div className="login-root" style={{ minHeight: '100vh', background: '#06080d', display: 'flex', fontFamily: "'Syne', Georgia, serif" }}>

        {/* LEFT PANEL — hidden on mobile */}
        <div className="left-panel" style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative', borderRight: '1px solid rgba(201,168,76,0.08)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '30%', left: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
            <img src="/logo.png" alt="Nova-Lite" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0', letterSpacing: 0.5 }}>NOVA-LITE</div>
              <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace" }}>CLUB10 POOL</div>
            </div>
          </Link>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
            <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1, color: '#e2e8f0' }}>
              Trade Bigger.<br />
              <span style={{ color: '#c9a84c', fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic' }}>Together.</span>
            </h1>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
              Join Nova-Lite Club10 Pool — a transparent community forex trading pool with proportional profits, real-time MT4 monitoring and monthly withdrawals.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '◎', text: 'Complete KYC verification & security' },
                { icon: '⬡', text: 'Join batch pools from $100 to $10,000' },
                { icon: '◈', text: 'Monitor trades live via MT4 investor login' },
                { icon: '⟁', text: 'Withdraw monthly with zero penalties' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 40, left: 80, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#334155' }}>
            Built on Transparency. Driven by Integrity.
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel" style={{ width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', flexShrink: 0 }}>

          {/* Mobile-only logo */}
          <div className="mobile-logo" style={{ alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
            <img src="/logo.png" alt="Nova-Lite" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0', letterSpacing: 0.5 }}>NOVA-LITE</div>
              <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace" }}>CLUB10 POOL</div>
            </div>
          </div>

          <div className="fade-in">
            {tab !== 'forgot' && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, marginBottom: 32, border: '1px solid rgba(201,168,76,0.1)' }}>
                {(['login', 'register'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); setAgreedToTerms(false) }} style={{
                    flex: 1, padding: '10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: tab === t ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: tab === t ? '#c9a84c' : '#64748b',
                    fontWeight: tab === t ? 700 : 400, fontSize: 13,
                    fontFamily: "'Syne', Georgia, serif",
                    borderBottom: tab === t ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}>{t === 'login' ? 'Sign In' : 'Create Account'}</button>
                ))}
              </div>
            )}

            {tab === 'forgot' && (
              <div style={{ marginBottom: 28 }}>
                <button onClick={() => { setTab('login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontFamily: "'Syne', Georgia, serif" }}>
                  ← Back to Sign In
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
                  <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Reset Password</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Enter your email to receive a reset link</div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span> {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#00d4aa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>✓</span> {success}
              </div>
            )}

            {/* LOGIN */}
            {tab === 'login' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin(e)} />
                </div>
                <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, fontFamily: "'Syne', Georgia, serif", letterSpacing: 0.5, transition: 'all 0.2s' }}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
                <button onClick={() => { setTab('forgot'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: "'Syne', Georgia, serif", textAlign: 'center' }}>
                  Forgot your password?
                </button>
              </div>
            )}

            {/* REGISTER */}
            {tab === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" style={inputStyle} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="e.g. John Adebayo" />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number <span style={{ color: '#334155' }}>(optional)</span></label>
                  <input type="text" style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234 801 234 5678" />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" style={inputStyle} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 8 characters" />
                </div>
                <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 10, padding: '14px 16px' }}>
                  <div className="checkbox-wrap" onClick={() => setAgreedToTerms(p => !p)}>
                    <div className={`custom-checkbox ${agreedToTerms ? 'checked' : ''}`}>
                      {agreedToTerms && <span style={{ color: '#000', fontSize: 11, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, userSelect: 'none' }}>
                      I have read and agree to the{' '}
                      <button className="terms-link" onClick={e => { e.stopPropagation(); setShowTerms(true) }}>Terms & Conditions</button>
                      {' '}and{' '}
                      <button className="terms-link" onClick={e => { e.stopPropagation(); setShowTerms(true) }}>Club10 Pool Agreement</button>
                      . I understand that forex trading involves risk and profits are not guaranteed.
                    </span>
                  </div>
                </div>
                <button onClick={handleRegister} disabled={loading || !agreedToTerms} style={{ width: '100%', background: agreedToTerms ? 'linear-gradient(135deg,#c9a84c,#a07830)' : 'rgba(201,168,76,0.2)', color: agreedToTerms ? '#000' : '#64748b', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 14, cursor: loading || !agreedToTerms ? 'not-allowed' : 'pointer', fontFamily: "'Syne', Georgia, serif", letterSpacing: 0.5, transition: 'all 0.3s' }}>
                  {loading ? 'Creating Account...' : 'Create Account →'}
                </button>
              </div>
            )}

            {/* FORGOT */}
            {tab === 'forgot' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                </div>
                <button onClick={handleForgot} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'Syne', Georgia, serif" }}>
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </div>
            )}

            <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#334155', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>
              Nova-Lite Club10 Pool · Secure Investment Platform<br />
              <Link href="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 11 }}>← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>

      {/* TERMS MODAL */}
      {showTerms && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowTerms(false)}>
          <div className="modal-in" onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, maxWidth: 680, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#e2e8f0' }}>Terms & Conditions</div>
                <div style={{ fontSize: 10, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginTop: 2 }}>CLUB10 POOL AGREEMENT</div>
              </div>
              <button onClick={() => setShowTerms(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: '#94a3b8', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
              <TermsContent />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(201,168,76,0.1)', display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => { setAgreedToTerms(true); setShowTerms(false) }} style={{ flex: 1, minWidth: 160, background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: "'Syne', Georgia, serif" }}>
                ✓ I Agree to These Terms
              </button>
              <button onClick={() => setShowTerms(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', borderRadius: 8, padding: '12px 20px', fontSize: 13, cursor: 'pointer', fontFamily: "'Syne', Georgia, serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TermsContent() {
  const s = {
    h2: { fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 10, marginTop: 28, letterSpacing: 0.5 } as React.CSSProperties,
    p: { fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 } as React.CSSProperties,
    li: { fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 6, paddingLeft: 16, position: 'relative' as const },
  }
  return (
    <div style={{ fontFamily: "'Syne', Georgia, serif" }}>
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>⚠ Risk Warning</div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>Forex trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Only invest funds you can afford to lose entirely.</div>
      </div>
      <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace", marginBottom: 20 }}>Last Updated: January 2025 · Nova-Lite Ltd</div>

      <h2 style={s.h2}>1. Introduction & Acceptance</h2>
      <p style={s.p}>By registering an account and joining Nova-Lite Club10 Pool, you ("Member") confirm that you have read, understood, and agreed to be bound by these Terms & Conditions and the Club10 Pool Agreement. If you do not agree, do not register or participate.</p>

      <h2 style={s.h2}>2. About Nova-Lite Club10 Pool</h2>
      <p style={s.p}>Nova-Lite Club10 Pool is a community-driven capital pooling system that combines member contributions into a shared forex trading account, operating on principles of full transparency, proportional profit distribution, and strict risk management. Members retain real-time read-only monitoring access via MT4 investor login.</p>

      <h2 style={s.h2}>3. Eligibility & Verification</h2>
      <p style={s.p}>To participate in Club10 Pool you must:</p>
      <ul style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 16 }}>
        {['Be at least 18 years of age', 'Complete email verification', 'Pass KYC identity verification', 'Provide accurate and truthful personal information', 'Not be subject to any legal restriction preventing investment participation'].map(item => (
          <li key={item} style={s.li}><span style={{ color: '#c9a84c', marginRight: 8 }}>◆</span>{item}</li>
        ))}
      </ul>

      <h2 style={s.h2}>4. Batch Pool Participation</h2>
      <p style={s.p}>Members join a specific batch pool cycle. Once a batch reaches its target, it closes and funds are deployed to a dedicated trading account. Members cannot withdraw during an active trading cycle except at designated month-end periods.</p>

      <h2 style={s.h2}>5. Profit Distribution</h2>
      <p style={s.p}>Profits are distributed proportionally based on each member's contribution share of the total pool capital. Distribution occurs at the end of each monthly trading cycle after applicable fees are deducted.</p>

      <h2 style={s.h2}>6. Risk Management & Equity Protection</h2>
      <p style={s.p}>A strict 50% equity hard cap is enforced across all trading accounts. Trading will be suspended if drawdown reaches 50% of pool equity. Despite this protection, losses remain possible and capital is never fully guaranteed.</p>

      <h2 style={s.h2}>7. Withdrawals</h2>
      <p style={s.p}>Members may request withdrawals at the end of any trading month with zero penalties. Options include: profits only, full capital contribution, or continued participation into the next cycle.</p>

      <h2 style={s.h2}>8. MT4 Investor Access</h2>
      <p style={s.p}>Upon batch activation, members receive MT4 investor login credentials providing real-time read-only access. Members must not share, misuse, or attempt to interfere with trading operations through this access.</p>

      <h2 style={s.h2}>9. Risk Acknowledgement</h2>
      <p style={s.p}>By agreeing to these terms, you explicitly acknowledge that:</p>
      <ul style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 16 }}>
        {['Forex trading involves substantial and potentially total loss of capital', 'Past performance does not guarantee future results', 'No profit or return is guaranteed under any circumstance', 'You are investing funds you can afford to lose', 'You have independently assessed the risks involved'].map(item => (
          <li key={item} style={s.li}><span style={{ color: '#ef4444', marginRight: 8 }}>◆</span>{item}</li>
        ))}
      </ul>

      <h2 style={s.h2}>10. Member Obligations</h2>
      <p style={s.p}>Members agree to provide accurate information, maintain account security, not engage in fraudulent activity, comply with all applicable laws, and not attempt to manipulate pool operations or other members.</p>

      <h2 style={s.h2}>11. Limitation of Liability</h2>
      <p style={s.p}>Nova-Lite Ltd's liability to any member is limited to the amount of capital contributed to the pool. Nova-Lite Ltd is not liable for trading losses, market conditions, technical failures, or any indirect or consequential damages.</p>

      <h2 style={s.h2}>12. Governing Law</h2>
      <p style={s.p}>These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through the appropriate legal channels in Nigeria.</p>

      <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '16px 18px', marginTop: 24 }}>
        <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 700, marginBottom: 6 }}>Agreement Summary</div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>By clicking "I Agree", you confirm you are 18+, have read and understood all terms above, acknowledge the risks of forex trading, and agree to participate under these conditions.</div>
      </div>
    </div>
  )
}

