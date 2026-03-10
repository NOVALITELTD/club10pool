import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const investors = await prisma.$queryRaw<any[]>`
    SELECT
      i.id, i."fullName", i.email, i.phone,
      i.nationality, i."dateOfBirth", i."walletAddress",
      i."emailVerified", i."createdAt",
      COALESCE(
        (SELECT k.status FROM kyc_submissions k
         WHERE k."investorId" = i.id
         ORDER BY k."submittedAt" DESC LIMIT 1),
        'NOT_SUBMITTED'
      ) AS "kycStatus"
    FROM investors i
    WHERE i."isAdmin" = false OR i."isAdmin" IS NULL
    ORDER BY i."createdAt" DESC
  `
  return ok(investors)
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()
  try {
    const body = await req.json()
    const investor = await prisma.investor.create({ data: body })
    return NextResponse.json(investor, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create investor' }, { status: 500 })
  }
}
