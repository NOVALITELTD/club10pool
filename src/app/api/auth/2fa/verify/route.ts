// src/app/api/auth/2fa/verify/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import { signToken } from '@/lib/auth'
import * as OTPAuth from 'otpauth'

export async function POST(req: NextRequest) {
  const { investorId, token: totpToken } = await req.json()
  if (!investorId || !totpToken) return error('Missing fields')

  // No "isAdmin" column — use prisma.investor model directly
  const inv = await prisma.investor.findUnique({ where: { id: investorId } })
  if (!inv) return error('Not found', 404)
  if (!inv.twoFaEnabled || !inv.twoFaSecret) return error('2FA not enabled')

  // Strip PENDING: prefix if present (stored during setup)
  const secretBase32 = inv.twoFaSecret.startsWith('PENDING:')
    ? inv.twoFaSecret.slice(8)
    : inv.twoFaSecret

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })
  const delta = totp.validate({ token: totpToken, window: 1 })
  if (delta === null) return error('Invalid authenticator code')

  // Update lastLoginAt
  await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${investorId}`

  // Use signToken (same as rest of app) — isAdmin: false for investors
  const token = signToken({ memberId: inv.id, email: inv.email, isAdmin: false })

  // Fetch kycStatus for client
  const kycCheck = await prisma.$queryRaw<any[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${inv.id} ORDER BY "createdAt" DESC LIMIT 1
  `
  const kycStatus = kycCheck[0]?.status || 'NOT_SUBMITTED'

  return ok({
    token,
    member: {
      id: inv.id,
      fullName: inv.fullName,
      email: inv.email,
      isAdmin: false,
      emailVerified: inv.emailVerified,
      kycStatus,
    }
  })
}
