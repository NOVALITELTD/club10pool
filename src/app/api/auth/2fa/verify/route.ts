// src/app/api/auth/2fa/verify/route.ts
// Verify TOTP token during login
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import * as OTPAuth from 'otpauth'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { investorId, token: totpToken } = await req.json()
  if (!investorId || !totpToken) return error('Missing fields')

  const investor = await prisma.$queryRaw<any[]>`
    SELECT id, email, "twoFaSecret", "twoFaEnabled", "isAdmin"
    FROM investors WHERE id = ${investorId} LIMIT 1
  `
  if (!investor.length) return error('Not found', 404)
  const inv = investor[0]
  if (!inv.twoFaEnabled || !inv.twoFaSecret) return error('2FA not enabled')

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(inv.twoFaSecret),
  })

  const delta = totp.validate({ token: totpToken, window: 1 })
  if (delta === null) return error('Invalid authenticator code')

  // Update lastLoginAt
  await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${investorId}`

  // Issue full JWT
  const jwtToken = jwt.sign(
    { memberId: investorId, email: inv.email, isAdmin: inv.isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  return ok({ token: jwtToken })
}