// src/app/api/auth/2fa/verify/route.ts
// Step 1 of dual 2FA: verify TOTP token
// Returns { totpVerified: true } — client must then verify email OTP to complete login
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import { signToken } from '@/lib/auth'
import * as OTPAuth from 'otpauth'

export async function POST(req: NextRequest) {
  const { investorId, token: totpToken, skipDual } = await req.json()
  if (!investorId || !totpToken) return error('Missing fields')

  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, email, "fullName", "emailVerified", "kycStatus",
           "twoFaEnabled", "twoFaSecret", "twoFaMethod"
    FROM investors WHERE id = ${investorId} LIMIT 1
  `
  if (!rows.length) return error('Not found', 404)
  const inv = rows[0]

  if (!inv.twoFaEnabled || !inv.twoFaSecret) return error('2FA not enabled')

  const secretBase32 = inv.twoFaSecret.startsWith('PENDING:')
    ? inv.twoFaSecret.slice(8)
    : inv.twoFaSecret

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })
  const delta = totp.validate({ token: totpToken, window: 1 })
  if (delta === null) return error('Invalid authenticator code')

  // Dual 2FA: TOTP verified — now require email OTP as second factor
  // Send email OTP automatically
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  await prisma.$executeRaw`
    INSERT INTO security_codes (id, "investorId", purpose, code, "expiresAt", "createdAt")
    VALUES (${crypto.randomUUID()}, ${investorId}, 'LOGIN_2FA', ${code}, ${new Date(Date.now() + 10 * 60 * 1000)}, NOW())
  `

  // Send email (import sendEmail)
  const { sendEmail } = await import('@/lib/email')
  await sendEmail({
    to: inv.email,
    subject: '🔐 Club10 Pool — Login Verification Code',
    html: `
      <div style="font-family:monospace;background:#080a0f;color:#e2e8f0;padding:32px;border-radius:12px;max-width:440px;">
        <div style="font-size:11px;color:#c9a84c;letter-spacing:3px;margin-bottom:16px;">CLUB10 POOL — 2FA</div>
        <h2 style="margin:0 0 8px;font-size:20px;">Login Verification</h2>
        <p style="color:#64748b;font-size:13px;margin-bottom:24px;">Your TOTP was verified. Enter this code to complete sign-in:</p>
        <div style="background:#0d1117;border:1px solid rgba(201,168,76,0.3);border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
          <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#c9a84c;">${code}</div>
          <div style="font-size:11px;color:#64748b;margin-top:8px;">Expires in 10 minutes</div>
        </div>
        <p style="font-size:11px;color:#334155;">If you did not attempt to sign in, please change your password immediately.</p>
      </div>
    `,
  })

  return ok({ totpVerified: true, requiresEmailOtp: true, investorId })
}
