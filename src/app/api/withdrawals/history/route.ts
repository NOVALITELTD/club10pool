// src/app/api/withdrawals/history/route.ts
// Returns all past completed payout requests for the logged-in investor
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const history = await prisma.$queryRaw<any[]>`
    SELECT
      pr.id,
      pr."batchCode",
      pr.amount,
      pr."profitAmount",
      pr."capitalAmount",
      pr."withdrawalType",
      pr.status,
      pr."paymentDone",
      pr."paidAt",
      pr."walletAddress",
      pr."createdAt"
    FROM payout_requests pr
    WHERE pr."investorId" = ${auth.memberId}
    ORDER BY pr."createdAt" DESC
  `

  return ok(history)
}