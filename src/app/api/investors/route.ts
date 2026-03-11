// src/app/api/investors/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const investors = await prisma.$queryRaw<any[]>`
      SELECT
        i.id,
        i."fullName",
        i.email,
        i.phone,
        i."nationalId",
        i."walletAddress",
        i."nationality",
        i."dateOfBirth",
        i."twoFaEnabled",
        i."kycStatus",
        i."emailVerified",
        i."createdAt",
        i."whatsapp",
        (
          SELECT k.status FROM kyc_submissions k
          WHERE k."investorId" = i.id
          ORDER BY k."submittedAt" DESC
          LIMIT 1
        ) AS "latestKycStatus"
      FROM investors i
      ORDER BY i."createdAt" DESC
    `

    // Use latestKycStatus from kyc_submissions if available, fallback to investor.kycStatus
    const enriched = investors.map(inv => ({
      ...inv,
      kycStatus: inv.latestKycStatus || inv.kycStatus || 'NOT_SUBMITTED',
    }))

    return ok(enriched)
  } catch (e) {
    console.error(e)
    return error('Failed to fetch investors', 500)
  }
}
