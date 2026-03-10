// src/app/api/auth/security-code/verify/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, signToken } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, purpose, investorId: bodyInvestorId } = body

  let investorId: string | null = null
  const auth = getAuthFromRequest(req)

  if (auth) {
    investorId = auth.memberId
  } else if (purpose === 'LOGIN_2FA' && bodyInvestorId) {
    investorId = bodyInvestorId
  } else {
    return unauthorized()
  }

  if (!code || code.length !== 6) return error('Invalid code format')
  if (!purpose) return error('Purpose required')

  const record = await prisma.$queryRaw<any[]>`
    SELECT id FROM security_codes
    WHERE "investorId" = ${investorId}
      AND purpose = ${purpose}
      AND code = ${code}
      AND "expiresAt" > NOW()
      AND "usedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `
  if (!record.length) return error('Invalid or expired code. Please request a new one.')

  await prisma.$executeRaw`
    UPDATE security_codes SET "usedAt" = NOW() WHERE id = ${record[0].id}
  `

  // For LOGIN_2FA: issue full auth token (completes dual 2FA login)
  if (purpose === 'LOGIN_2FA') {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", "emailVerified", "kycStatus", "twoFaEnabled"
      FROM investors WHERE id = ${investorId} LIMIT 1
    `
    if (!rows.length) return error('Investor not found')
    const inv = rows[0]

    await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${investorId}`

    const token = signToken({ memberId: inv.id, email: inv.email, isAdmin: false })

    const kycCheck = await prisma.$queryRaw<any[]>`
      SELECT status FROM kyc_submissions
      WHERE "investorId" = ${investorId}
      ORDER BY "submittedAt" DESC LIMIT 1
    `
    const kycStatus = kycCheck[0]?.status ?? inv.kycStatus ?? 'NOT_SUBMITTED'

    return ok({
      verified: true,
      token,
      member: {
        id: inv.id,
        fullName: inv.fullName,
        email: inv.email,
        isAdmin: false,
        emailVerified: inv.emailVerified ?? false,
        kycStatus,
        twoFaEnabled: inv.twoFaEnabled ?? false,
      },
    })
  }

  return ok({ verified: true })
}
