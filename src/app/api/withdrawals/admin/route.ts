// src/app/api/withdrawals/admin/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const payouts = await prisma.$queryRaw<any[]>`
    SELECT 
      pr.id, pr.amount, pr.status, pr."batchCode", pr."paymentDone", pr."paidAt", pr."createdAt",
      i."fullName" as "investorName", i.email, i."walletAddress"
    FROM payout_requests pr
    JOIN investors i ON i.id = pr."investorId"
    ORDER BY pr."createdAt" DESC
  `
  return ok(payouts)
}
