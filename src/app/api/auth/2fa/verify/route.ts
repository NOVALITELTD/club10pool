// src/app/api/auth/2fa/verify/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import { signToken } from '@/lib/auth'
import * as OTPAuth from 'otpauth'

export async function POST(req: NextRequest) {
  const { investorId, token: totpToken } = await req.json()
  if (!investorId || !totpToken) return error('Missing fields')

  // Raw query only — prisma.investor.findUnique misses twoFaEnabled/twoFaSecret
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, email, "fullName", "emailVerified", "kycStatus",
           "twoFaEnabled", "twoFaSecret"
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

  await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${investorId}`

  const token = signToken({ memberId: inv.id, email: inv.email, isAdmin: false })

  // kyc_submissions uses "submittedAt" not "createdAt"
  const kycCheck = await prisma.$queryRaw<any[]>`
    SELECT status FROM kyc_submissions
    WHERE "investorId" = ${inv.id}
    ORDER BY "submittedAt" DESC LIMIT 1
  `
  const kycStatus = kycCheck[0]?.status ?? 'NOT_SUBMITTED'

  return ok({
    token,
    member: {
      id: inv.id,
      fullName: inv.fullName,
      email: inv.email,
      isAdmin: false,
      emailVerified: inv.emailVerified ?? false,
      kycStatus,
      twoFaEnabled: inv.twoFaEnabled,
    }
  })
}
