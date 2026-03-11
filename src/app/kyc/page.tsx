// src/app/kyc/route.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ID_TYPES = [
  { value: 'voters_card', label: "Voter's Card" },
  { value: 'nin', label: 'NIN Slip' },
  { value: 'drivers_licence', label: "Driver's Licence" },
  { value: 'international_passport', label: 'International Passport' },
]

type FileField = 'idFront' | 'idBack' | 'passportPhoto' | 'proofOfAddress'

const FILE_FIELDS: { key: FileField; label: string; desc: string; required: boolean; acceptPdf?: boolean }[] = [
  { key: 'idFront', label: 'ID Front', desc: 'Front side of your identity document', required: true, acceptPdf: false },
  { key: 'idBack', label: 'ID Back', desc: 'Back side of your identity document', required: true, acceptPdf: false },
  { key: 'passportPhoto', label: 'Passport Photo', desc: 'Clear face photo on white background', required: true, acceptPdf: false },
  { key: 'proofOfAddress', label: 'Proof of Address', desc: 'Utility bill or bank statement (last 3 months)', required: true, acceptPdf: true },
]

const MAX_PER_FILE = 3 * 1024 * 1024  // 3MB
const MAX_TOTAL   = 5 * 1024 * 1024  // 5MB

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

function getFileIcon(file: File | null, fieldKey: FileField) {
  if (!file) return '📄';
  
  // Check if it's a PDF (only for proof of address)
  if (fieldKey === 'proofOfAddress' && file.type === 'application/pdf') {
    return '📑'; // PDF icon
  }
  
  // Check if it's an image
  if (file.type.startsWith('image/')) {
    return '🖼️'; // Image icon
  }
  
  return '📄'; // Default file icon
}

function isFileTypeValid(file: File, fieldKey: FileField) {
  // For proof of address, accept both images and PDFs
  if (fieldKey === 'proofOfAddress') {
    return file.type.startsWith('image/') || file.type === 'application/pdf';
  }
  
  // For all other fields, only accept images
  return file.type.startsWith('image/');
}

export default function KYCPage() {
  const router = useRouter()
  const [idType, setIdType] = useState('')
  const [files, setFiles] = useState<Record<FileField, File | null>>({
    idFront: null, idBack: null, passportPhoto: null, proofOfAddress: null,
  })
  const [previews, setPreviews] = useState<Record<FileField, string | null>>({
    idFront: null, idBack: null, passportPhoto: null, proofOfAddress: null,
  })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const refs = {
    idFront: useRef<HTMLInputElement>(null),
    idBack: useRef<HTMLInputElement>(null),
    passportPhoto: useRef<HTMLInputElement>(null),
    proofOfAddress: useRef<HTMLInputElement>(null),
  }

  // Auto-load token from URL (for email resubmit links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('token', urlToken)
      window.history.replaceState({}, '', '/kyc')
    }
  }, [])

  function getTotalSize(currentFiles: Record<FileField, File | null>) {
    return Object.values(currentFiles).reduce((sum, f) => sum + (f?.size || 0), 0)
  }

  function handleFile(key: FileField, file: File | null) {
    if (!file) return

    // Validate file type
    if (!isFileTypeValid(file, key)) {
      if (key === 'proofOfAddress') {
        setError(`"${file.name}" is not supported. Please upload an image (JPG, PNG) or PDF file.`)
      } else {
        setError(`"${file.name}" is not supported. Please upload an image (JPG, PNG).`)
      }
      return
    }

    if (file.size > MAX_PER_FILE) {
      setError(`"${file.name}" is ${formatMB(file.size)} — each file must be under 3MB.`)
      return
    }

    const updatedFiles = { ...files, [key]: file }
    const totalSize = getTotalSize(updatedFiles)
    if (totalSize > MAX_TOTAL) {
      setError(`Total size would be ${formatMB(totalSize)} — all files combined must be under 5MB. Please use smaller or compressed files.`)
      return
    }

    setFiles(updatedFiles)
    
    // Only create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target?.result as string }))
      reader.readAsDataURL(file)
    } else {
      // For PDFs, set a placeholder preview
      setPreviews(p => ({ ...p, [key]: 'pdf' }))
    }
    
    setError('')
  }

  async function handleSubmit() {
    setError('')

    if (!idType) return setError('Please select your ID type')
    for (const f of FILE_FIELDS) {
      if (f.required && !files[f.key]) return setError(`Please upload: ${f.label}`)
    }

    const totalSize = getTotalSize(files)
    if (totalSize > MAX_TOTAL) {
      return setError(`Total file size is ${formatMB(totalSize)} — must be under 5MB. Please use smaller or compressed files.`)
    }

    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    setUploading(true)

    try {
      setProgress('Uploading Documents...')
      const formData = new FormData()
      for (const f of FILE_FIELDS) {
        if (files[f.key]) formData.append(f.key, files[f.key]!)
      }

      const uploadRes = await fetch('/api/kyc/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      const { urls } = uploadData.data

      setProgress('Submitting KYC application...')
      const submitRes = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idType,
          idFrontUrl: urls.idFront || '',
          idBackUrl: urls.idBack || '',
          passportPhotoUrl: urls.passportPhoto || '',
          proofOfAddressUrl: urls.proofOfAddress || '',
        }),
      })

      const submitData = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitData.error || 'Submission failed')

      const userData = localStorage.getItem('user')
      if (userData) {
        const parsed = JSON.parse(userData)
        parsed.kycStatus = 'PENDING'
        localStorage.setItem('user', JSON.stringify(parsed))
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setUploading(false)
      setProgress('')
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)',
    borderRadius: 8, padding: '11px 14px', color: '#e2e8f0', fontSize: 14,
    boxSizing: 'border-box' as const, outline: 'none', fontFamily: "'Syne', Georgia, serif",
  }
  const labelStyle = {
    fontSize: 10, color: '#64748b', display: 'block', marginBottom: 7,
    letterSpacing: 1.5, textTransform: 'uppercase' as const, fontFamily: "'JetBrains Mono', monospace",
  }

  const totalSize = getTotalSize(files)
  const totalPct  = Math.min((totalSize / MAX_TOTAL) * 100, 100)
  const totalColor = totalPct > 90 ? '#ef4444' : totalPct > 70 ? '#f59e0b' : '#00d4aa'

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#06080d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Syne', Georgia, serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>✓</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>KYC Submitted!</div>
        <div style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Your identity documents have been securely uploaded. Our team will review your submission and notify you within 24–48 hours.
        </div>
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          📧 You will receive an email once your KYC is approved and your account is activated.
        </div>
        <Link href="/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c9a84c,#a07830)', color: '#000', fontWeight: 800, fontSize: 14, padding: '14px 36px', borderRadius: 10, textDecoration: 'none' }}>
          Back to Login →
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #06080d; }
        select option { background: #0d1117; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #c9a84c; border-radius: 2px; }
        .file-drop { transition: all 0.2s; }
        .file-drop:hover { border-color: rgba(201,168,76,0.4) !important; background: rgba(201,168,76,0.04) !important; }
        @media (max-width: 600px) {
          .kyc-grid { grid-template-columns: 1fr !important; }
          .kyc-wrap { padding: 24px 16px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#06080d', color: '#e2e8f0', fontFamily: "'Syne', Georgia, serif" }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Club10" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>NOVA-LITE</div>
              <div style={{ fontSize: 9, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace" }}>CLUB10 POOL</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>KYC VERIFICATION</div>
        </div>

        <div className="kyc-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 60px' }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>IDENTITY VERIFICATION</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>KYC Verification</h1>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
              Upload clear photos of your identity documents. All files are securely stored and only accessible to our verification team.
            </p>
          </div>

          {/* Steps indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
            {['Register', 'Verify Email', 'KYC Docs', 'Pending Approval'].map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 2 ? '#c9a84c' : i < 2 ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.05)', border: i < 2 ? '1px solid #00d4aa' : i === 2 ? 'none' : '1px solid #1e2530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 2 ? '#000' : i < 2 ? '#00d4aa' : '#475569', flexShrink: 0 }}>{i < 2 ? '✓' : i + 1}</div>
                </div>
                {i < 3 && <div style={{ width: 20, height: 1, background: i < 2 ? 'rgba(0,212,170,0.3)' : '#1e2530' }} />}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, color: '#ef4444', fontSize: 13, display: 'flex', gap: 8 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* ID Type */}
          <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Select ID Type</div>
            <div>
              <label style={labelStyle}>Identity Document Type</label>
              <select value={idType} onChange={e => setIdType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Choose your ID type...</option>
                {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* File uploads */}
          <div style={{ background: '#0d1117', border: '1px solid #1e2530', borderRadius: 14, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Upload Documents</div>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                Max 3MB per file · 5MB total
              </div>
            </div>

            {/* Total size progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                  Accepted formats: JPG, PNG {files.proofOfAddress?.type === 'application/pdf' ? '' : '(PDF only for Proof of Address)'}
                </div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: totalColor }}>
                  {formatMB(totalSize)} / 5.0MB
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPct}%`, background: totalColor, borderRadius: 2, transition: 'width 0.3s, background 0.3s' }} />
              </div>
            </div>

            <div className="kyc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {FILE_FIELDS.map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>
                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    {files[field.key] && (
                      <span style={{ color: '#475569', marginLeft: 6 }}>({formatMB(files[field.key]!.size)})</span>
                    )}
                  </label>
                  <div
                    className="file-drop"
                    onClick={() => refs[field.key].current?.click()}
                    style={{ border: `1px dashed ${files[field.key] ? 'rgba(0,212,170,0.4)' : 'rgba(201,168,76,0.2)'}`, borderRadius: 10, padding: 16, cursor: 'pointer', background: files[field.key] ? 'rgba(0,212,170,0.04)' : 'rgba(255,255,255,0.02)', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', overflow: 'hidden' }}
                  >
                    {previews[field.key] ? (
                      previews[field.key] === 'pdf' ? (
                        <>
                          <div style={{ fontSize: 48, opacity: 0.8 }}>📑</div>
                          <div style={{ fontSize: 10, color: '#00d4aa', fontFamily: "'JetBrains Mono', monospace" }}>✓ {files[field.key]?.name}</div>
                        </>
                      ) : (
                        <>
                          <img src={previews[field.key]!} alt={field.label} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
                          <div style={{ fontSize: 10, color: '#00d4aa', fontFamily: "'JetBrains Mono', monospace" }}>✓ {files[field.key]?.name}</div>
                        </>
                      )
                    ) : (
                      <>
                        <div style={{ fontSize: 28, opacity: 0.4 }}>{getFileIcon(files[field.key], field.key)}</div>
                        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>{field.desc}</div>
                        <div style={{ fontSize: 10, color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace" }}>
                          Click to upload {field.acceptPdf ? '(JPG, PNG, PDF)' : '(JPG, PNG)'}
                        </div>
                      </>
                    )}
                    <input
                      ref={refs[field.key]}
                      type="file"
                      accept={field.acceptPdf ? "image/jpeg,image/png,image/jpg,application/pdf" : "image/jpeg,image/png,image/jpg"}
                      style={{ display: 'none' }}
                      onChange={e => handleFile(field.key, e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice */}
          <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
            🔒 <strong style={{ color: '#94a3b8' }}>Security Notice:</strong> Your documents are encrypted and stored securely. They are only accessible to authorised Nova-Lite staff for verification purposes and are never shared with third parties.
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading}
            style={{ width: '100%', background: uploading ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg,#c9a84c,#a07830)', color: uploading ? '#64748b' : '#000', border: 'none', borderRadius: 12, padding: '16px', fontWeight: 800, fontSize: 15, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: "'Syne', Georgia, serif", transition: 'all 0.2s' }}
          >
            {uploading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #64748b', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                {progress || 'Uploading...'}
              </span>
            ) : 'Submit KYC Documents →'}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </>
  )
}
