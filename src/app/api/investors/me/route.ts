// src/app/api/investors/me/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  // Single raw query — returns ALL fields including ones added after prisma generate
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, "fullName", email, phone,
           "walletAddress", "emailVerified", "kycStatus",
           "twoFaEnabled", "twoFaMethod", nationality, "dateOfBirth"
    FROM investors WHERE id = ${auth.memberId} LIMIT 1
  `
  if (!rows.length) return error('Not found', 404)
  const inv = rows[0]

  // Get latest KYC status from kyc_submissions (source of truth)
  const kycCheck = await prisma.$queryRaw<any[]>`
    SELECT status FROM kyc_submissions
    WHERE "investorId" = ${auth.memberId}
    ORDER BY "submittedAt" DESC LIMIT 1
  `
  const kycStatus = kycCheck[0]?.status ?? inv.kycStatus ?? 'NOT_SUBMITTED'

  return ok({
    id: inv.id,
    fullName: inv.fullName,
    email: inv.email,
    phone: inv.phone,
    walletAddress: inv.walletAddress,
    emailVerified: inv.emailVerified ?? false,
    kycStatus,
    twoFaEnabled: inv.twoFaEnabled ?? false,
    twoFaMethod: inv.twoFaMethod ?? 'TOTP',
    nationality: inv.nationality,
    dateOfBirth: inv.dateOfBirth,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  try {
    const { fullName, phone, walletAddress } = await req.json()

    await prisma.$executeRaw`
      UPDATE investors
      SET "fullName" = COALESCE(${fullName}, "fullName"),
          phone = COALESCE(${phone}, phone),
          "walletAddress" = COALESCE(${walletAddress ?? null}, "walletAddress"),
          "updatedAt" = NOW()
      WHERE id = ${auth.memberId}
    `

    // Return updated profile
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, "fullName", email, phone, "walletAddress",
             "emailVerified", "kycStatus", "twoFaEnabled", "twoFaMethod"
      FROM investors WHERE id = ${auth.memberId} LIMIT 1
    `
    return ok(rows[0])
  } catch (e) {
    return error('Server error', 500)
  }
}
