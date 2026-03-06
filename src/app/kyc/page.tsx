'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function KYCPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [idType, setIdType] = useState('')
  const [files, setFiles] = useState<Record<string, File | null>>({
    idFront: null, idBack: null, passportPhoto: null, proofOfAddress: null,
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    if (userData) setUser(JSON.parse(userData))
  }, [])

  async function uploadToSupabase(file: File, path: string): Promise<string> {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setError('')
    if (!idType) return setError('Please select an ID type')
    if (!files.idFront || !files.idBack || !files.passportPhoto || !files.proofOfAddress) {
      return setError('All documents are required')
    }

    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const investorId = user?.id

      const [idFrontUrl, idBackUrl, passportPhotoUrl, proofOfAddressUrl] = await Promise.all([
        uploadToSupabase(files.idFront!, `${investorId}/id-front`),
        uploadToSupabase(files.idBack!, `${investorId}/id-back`),
        uploadToSupabase(files.passportPhoto!, `${investorId}/passport-photo`),
        uploadToSupabase(files.proofOfAddress!, `${investorId}/proof-of-address`),
      ])

      const r = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ idType, idFrontUrl, idBackUrl, passportPhotoUrl, proofOfAddressUrl }),
      })
      const d = await r.json()
      if (!r.ok) return setError(d.error)

      const updatedUser = { ...user, kycStatus: 'PENDING' }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>KYC Submitted!</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Your documents are under review. You'll be notified once approved. This usually takes 1-2 business days.
        </p>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
          Go to Dashboard
        </button>
      </div>
    </div>
  )

  const inputStyle = {
    width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
    boxSizing: 'border-box' as const,
  }

  const docFields = [
    { key: 'idFront', label: 'Government ID — Front' },
    { key: 'idBack', label: 'Government ID — Back' },
    { key: 'passportPhoto', label: 'Passport Photo / Selfie' },
    { key: 'proofOfAddress', label: 'Proof of Address' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🪪</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Identity Verification</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            Complete KYC to access your investor dashboard
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>ID Type</label>
            <select value={idType} onChange={e => setIdType(e.target.value)} style={inputStyle}>
              <option value="">Select ID type...</option>
              <option value="voters_card">Voter's Card</option>
              <option value="nin">NIN (National ID)</option>
              <option value="drivers_licence">Driver's Licence</option>
              <option value="international_passport">International Passport</option>
            </select>
          </div>

          {docFields.map(({ key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
              <input
                type="file" accept="image/*,.pdf"
                onChange={e => setFiles(p => ({ ...p, [key]: e.target.files?.[0] || null }))}
                style={{ ...inputStyle, padding: '8px 14px' }}
              />
              {files[key] && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>✓ {(files[key] as File).name}</div>}
            </div>
          ))}

          <button onClick={handleSubmit} disabled={uploading} style={{
            width: '100%', background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14,
            cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, marginTop: 8,
          }}>
            {uploading ? 'Uploading documents...' : 'Submit KYC'}
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Your documents are encrypted and stored securely. Only admins can view them.
        </p>
      </div>
    </div>
  )
}