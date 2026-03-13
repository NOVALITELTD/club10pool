// src/app/api/withdrawals/my/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  // Get the latest withdrawal window for this investor's batch
  const result = await prisma.$queryRaw<any[]>`
    SELECT
      wr.*,
      b."batchCode",
      -- How many total active+withdrawal_requested members in the batch
      (SELECT COUNT(*) FROM batch_members bm2
       WHERE bm2."batchId" = wr."batchId"
         AND bm2.status IN ('ACTIVE', 'WITHDRAWAL_REQUESTED', 'WITHDRAWN')
      ) AS "totalMembers",
      -- How many have already submitted a payout request
      (SELECT COUNT(*) FROM payout_requests pr
       WHERE pr."batchCode" = b."batchCode"
      ) AS "confirmedCount",
      -- This investor's existing payout request (if any)
      pr.id AS "payoutRequestId",
      pr."withdrawalType",
      pr.amount AS "payoutAmount",
      pr."capitalAmount" AS "payoutCapitalAmount",
      pr."profitAmount" AS "payoutProfitAmount",
      pr."paymentDone",
      pr.status AS "payoutStatus",
      -- This investor's capital in the batch
      bm."capitalAmount" AS "myCapitalAmount"
    FROM withdrawal_requests wr
    JOIN batches b ON b.id = wr."batchId"
    JOIN batch_members bm ON bm."batchId" = wr."batchId"
      AND bm."investorId" = ${auth.memberId}
    LEFT JOIN payout_requests pr ON pr."investorId" = ${auth.memberId}
      AND pr."batchCode" = b."batchCode"
    WHERE wr.active = true
    ORDER BY wr."createdAt" DESC
    LIMIT 1
  `

  if (!result.length) return ok(null)

  const row = result[0]

  return ok({
    // Withdrawal window info
    id: row.id,
    batchCode: row.batchCode,
    batchId: row.batchId,
    active: row.active,

    // Profit amount for this investor
    amount: row.amount,

    // Capital amount for this investor
    myCapitalAmount: parseFloat(row.myCapitalAmount || 0),

    // Batch progress
    totalMembers: Number(row.totalMembers || 0),
    confirmedCount: Number(row.confirmedCount || 0),

    // This investor's submission (null if not yet submitted)
    submitted: !!row.payoutRequestId,
    withdrawalType: row.withdrawalType || null,
    payoutAmount: row.payoutAmount ? parseFloat(row.payoutAmount) : null,
    payoutCapitalAmount: row.payoutCapitalAmount ? parseFloat(row.payoutCapitalAmount) : null,
    payoutProfitAmount: row.payoutProfitAmount ? parseFloat(row.payoutProfitAmount) : null,
    paymentDone: row.paymentDone || false,
    payoutStatus: row.payoutStatus || null,
  })
}
