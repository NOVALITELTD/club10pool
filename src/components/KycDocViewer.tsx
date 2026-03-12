// src/components/KycDocViewer.tsx
// Usage: <KycDocViewer url={submission.proofOfAddressUrl} label="Proof of Address" />
'use client'
import { useState } from 'react'

interface Props {
  url: string | null | undefined
  label: string
}

export default function KycDocViewer({ url, label }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!url) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px', color: '#475569', fontSize: 13 }}>
        {label}: Not uploaded
      </div>
    )
  }

  const isPdf = url.includes('/raw/') || url.toLowerCase().endsWith('.pdf')

  async function handleView() {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const r = await fetch('/api/kyc/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Failed to get link'); return }
      window.open(d.data.signedUrl, '_blank')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>

      {isPdf ? (
        // PDF — can't preview inline, show a button that opens signed URL
        <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>📄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>PDF Document</div>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
              {url.split('/').pop()}
            </div>
          </div>
          <button
            onClick={handleView}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >
            {loading ? 'Loading...' : '🔗 View PDF'}
          </button>
        </div>
      ) : (
        // Image — show thumbnail, click to open signed URL full size
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={handleView}>
          <img
            src={url}
            alt={label}
            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.5)'; (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; (e.currentTarget as HTMLDivElement).style.opacity = '0' }}
          >
            {loading
              ? <span style={{ color: '#fff', fontSize: 13 }}>Loading...</span>
              : <span style={{ color: '#fff', fontSize: 13, background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 6 }}>🔍 View Full</span>
            }
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444' }}>⚠ {error}</div>
      )}
    </div>
  )
}
