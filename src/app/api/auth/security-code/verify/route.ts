// src/app/api/auth/security-code/verify/route.ts
// Verify OTP for WITHDRAWAL | SETTINGS | LOGIN_2FA
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
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

  return ok({ verified: true })
}