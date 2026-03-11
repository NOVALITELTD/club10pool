// src/app/api/investors/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  // Investors can only fetch their own record; admins can fetch any
  if (!requireAdmin(auth) && auth.memberId !== params.id) return forbidden()

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT i.id, i."fullName", i.email, i.phone,
             i."walletAddress", i."emailVerified", i."kycStatus",
             i."twoFaEnabled", i."twoFaMethod", i.nationality, i."dateOfBirth",
             i."createdAt"
      FROM investors i
      WHERE i.id = ${params.id}
      LIMIT 1
    `
    if (!rows.length) return notFound('Investor')

    const inv = rows[0]

    // Latest KYC status
    const kycCheck = await prisma.$queryRaw<any[]>`
      SELECT status FROM kyc_submissions
      WHERE "investorId" = ${params.id}
      ORDER BY "submittedAt" DESC LIMIT 1
    `
    inv.kycStatus = kycCheck[0]?.status ?? inv.kycStatus ?? 'NOT_SUBMITTED'

    // Include memberships + transactions for admin detail view
    if (requireAdmin(auth)) {
      const memberships = await prisma.batchMember.findMany({
        where: { investorId: params.id },
        include: { batch: true, profitShares: true },
      })
      const transactions = await prisma.transaction.findMany({
        where: { investorId: params.id },
        orderBy: { createdAt: 'desc' },
      })
      return ok({ ...inv, memberships, transactions })
    }

    return ok(inv)
  } catch (e) {
    console.error(e)
    return error('Failed to fetch investor', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()

    // Whitelist — admins can only update these fields via this route
    const { fullName, phone, walletAddress, kycStatus, nationality, dateOfBirth } = body

    await prisma.$executeRaw`
      UPDATE investors SET
        "fullName"      = COALESCE(${fullName ?? null},      "fullName"),
        phone           = COALESCE(${phone ?? null},          phone),
        "walletAddress" = COALESCE(${walletAddress ?? null},  "walletAddress"),
        "kycStatus"     = COALESCE(${kycStatus ?? null},      "kycStatus"),
        nationality     = COALESCE(${nationality ?? null},    nationality),
        "dateOfBirth"   = COALESCE(${dateOfBirth ?? null},    "dateOfBirth"),
        "updatedAt"     = NOW()
      WHERE id = ${params.id}
    `

    const updated = await prisma.$queryRaw<any[]>`
      SELECT id, "fullName", email, phone, "walletAddress",
             "kycStatus", nationality, "dateOfBirth", "updatedAt"
      FROM investors WHERE id = ${params.id} LIMIT 1
    `
    return ok(updated[0])
  } catch (e) {
    console.error(e)
    return error('Failed to update investor', 500)
  }
}
