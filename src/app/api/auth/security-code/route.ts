// src/app/api/auth/security-code/route.ts
// Unified OTP sender for: WITHDRAWAL, SETTINGS, LOGIN_2FA
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const PURPOSE_LABELS: Record<string, string> = {
  WITHDRAWAL: 'Withdrawal Confirmation',
  SETTINGS:   'Settings Verification',
  LOGIN_2FA:  'Login Verification',
}

export async function POST(req: NextRequest) {
  // For LOGIN_2FA, auth might not exist yet — accept investorId in body
  let investorId: string | null = null
  const auth = getAuthFromRequest(req)
  const body = await req.json()
  const purpose: string = body.purpose || 'SETTINGS'

  if (auth) {
    investorId = auth.memberId
  } else if (purpose === 'LOGIN_2FA' && body.investorId) {
    investorId = body.investorId
  } else {
    return unauthorized()
  }

  const investor = await prisma.$queryRaw<any[]>`
    SELECT id, email, "fullName" FROM investors WHERE id = ${investorId} LIMIT 1
  `
  if (!investor.length) return error('Investor not found', 404)
  const inv = investor[0]

  // Rate limit: max 1 code per 60s per purpose
  const recent = await prisma.$queryRaw<any[]>`
    SELECT id FROM security_codes
    WHERE "investorId" = ${investorId}
      AND purpose = ${purpose}
      AND "createdAt" > NOW() - INTERVAL '60 seconds'
    LIMIT 1
  `
  if (recent.length) return error('Please wait 60 seconds before requesting another code')

  const code = crypto.randomInt(100000, 999999).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await prisma.$executeRaw`
    INSERT INTO security_codes ("investorId", purpose, code, "expiresAt", "createdAt")
    VALUES (${investorId}, ${purpose}, ${code}, ${expiresAt}, NOW())
  `

  const label = PURPOSE_LABELS[purpose] || 'Verification'
  const purposeIcon = purpose === 'WITHDRAWAL' ? '💸' : purpose === 'SETTINGS' ? '⚙️' : '🔐'

  await sendEmail({
    to: inv.email,
    subject: `Club10 Pool — ${label} Code`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#080a0f;color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid #1e2530;">
        <div style="background:linear-gradient(135deg,#0d1117,#1a2235);padding:24px 28px;border-bottom:1px solid #1e2530;">
          <div style="font-size:11px;color:#00d4aa;letter-spacing:3px;margin-bottom:4px;">NOVA-LITE CLUB10 POOL</div>
          <div style="font-size:20px;font-weight:800;">${purposeIcon} ${label}</div>
        </div>
        <div style="padding:28px;">
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">
            Hi <strong style="color:#e2e8f0;">${inv.fullName}</strong>, use this code to complete your <strong>${label.toLowerCase()}</strong>.
          </p>
          <div style="background:#0d1117;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
            <div style="font-size:11px;color:#64748b;letter-spacing:3px;margin-bottom:12px;">SECURITY CODE</div>
            <div style="font-size:44px;font-weight:900;color:#c9a84c;letter-spacing:14px;font-family:monospace;">${code}</div>
            <div style="font-size:12px;color:#475569;margin-top:12px;">⏱ Expires in 10 minutes</div>
          </div>
          ${purpose === 'WITHDRAWAL' ? `
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#fca5a5;">
            🔐 <strong>Never share this code.</strong> If you did not request a withdrawal, please contact support immediately and change your password.
          </div>` : ''}
          <p style="color:#475569;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  })

  return ok({ message: 'Verification code sent to your email' })
}