// src/app/api/withdrawals/admin/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  // Get all payout requests grouped with investor wallet
  const payouts = await prisma.$queryRaw<any[]>`
    SELECT 
      pr.id, pr.amount, pr.status, pr."batchCode", 
      pr."paymentDone", pr."paidAt", pr."createdAt",
      pr."walletAddress",
      i."fullName" as "investorName", i.email
    FROM payout_requests pr
    JOIN investors i ON i.id = pr."investorId"
    ORDER BY pr."batchCode" ASC, pr."createdAt" DESC
  `

  // Also get total members per batch for progress tracking
  const batchTotals = await prisma.$queryRaw<any[]>`
    SELECT 
      wr."batchCode",
      COUNT(bm.id) as "totalMembers"
    FROM withdrawal_requests wr
    JOIN batches b ON b."batchCode" = wr."batchCode"
    JOIN batch_members bm ON bm."batchId" = b.id AND bm.status = 'ACTIVE'
    WHERE wr.active = true
    GROUP BY wr."batchCode"
  `

  const totalsMap: Record<string, number> = {}
  batchTotals.forEach((t: any) => { totalsMap[t.batchCode] = Number(t.totalMembers) })

  return ok({ payouts, batchTotals: totalsMap })
}
