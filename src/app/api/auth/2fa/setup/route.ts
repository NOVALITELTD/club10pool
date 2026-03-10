// src/app/api/auth/2fa/setup/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import * as OTPAuth from 'otpauth'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const investor = await prisma.$queryRaw<any[]>`
    SELECT email, "fullName" FROM investors WHERE id = ${auth.memberId} LIMIT 1
  `
  if (!investor.length) return error('Not found', 404)

  // Generate new TOTP secret — new OTPAuth.Secret() is the correct v9 API
  const totp = new OTPAuth.TOTP({
    issuer: 'Club10 Pool',
    label: investor[0].email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  })

  // Store temp secret (not yet confirmed)
  await prisma.$executeRaw`
    UPDATE investors SET "twoFaSecret" = ${'PENDING:' + totp.secret.base32} WHERE id = ${auth.memberId}
  `

  return ok({
    secret: totp.secret.base32,
    uri: totp.toString(),
    issuer: 'Club10 Pool',
    email: investor[0].email,
  })
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const { token } = await req.json()
  if (!token) return error('Token required')

  const investor = await prisma.$queryRaw<any[]>`
    SELECT "twoFaSecret" FROM investors WHERE id = ${auth.memberId} LIMIT 1
  `
  if (!investor.length) return error('Not found', 404)

  const raw = investor[0].twoFaSecret || ''
  if (!raw.startsWith('PENDING:')) return error('No pending 2FA setup found')

  const secretBase32 = raw.replace('PENDING:', '')
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  })

  const delta = totp.validate({ token, window: 1 })
  if (delta === null) return error('Invalid token — please try again or re-scan the QR code')

  await prisma.$executeRaw`
    UPDATE investors 
    SET "twoFaSecret" = ${secretBase32}, "twoFaEnabled" = true, "twoFaMethod" = 'TOTP'
    WHERE id = ${auth.memberId}
  `
  return ok({ message: '2FA enabled successfully' })
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const { code } = await req.json()
  if (!code) return error('Verification code required to disable 2FA')

  const record = await prisma.$queryRaw<any[]>`
    SELECT id FROM security_codes
    WHERE "investorId" = ${auth.memberId}
      AND purpose = 'SETTINGS'
      AND code = ${code}
      AND "expiresAt" > NOW()
      AND "usedAt" IS NULL
    ORDER BY "createdAt" DESC LIMIT 1
  `
  if (!record.length) return error('Invalid or expired code')

  await prisma.$executeRaw`UPDATE security_codes SET "usedAt" = NOW() WHERE id = ${record[0].id}`
  await prisma.$executeRaw`
    UPDATE investors SET "twoFaEnabled" = false, "twoFaSecret" = NULL WHERE id = ${auth.memberId}
  `
  return ok({ message: '2FA disabled' })
}
