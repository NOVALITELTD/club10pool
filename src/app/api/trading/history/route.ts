// src/app/api/trading/history/route.ts
// Serves trading reports to investors (filtered to their batch)
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const url = new URL(req.url)
  const reportId = url.searchParams.get('reportId') // for fetching trades of a specific report

  // Get investor's active batch(es)
  const memberships = await prisma.$queryRaw<any[]>`
    SELECT bm."batchId", b."batchCode"
    FROM batch_members bm
    JOIN batches b ON b.id = bm."batchId"
    WHERE bm."investorId" = ${auth.memberId}
      AND bm.status IN ('ACTIVE', 'WITHDRAWAL_REQUESTED')
  `

  if (!memberships.length) return ok({ reports: [], trades: [] })

  const batchIds = memberships.map((m: any) => m.batchId)

  // If requesting trades for a specific report
  if (reportId) {
    // Verify the report belongs to investor's batch
    const reportCheck = await prisma.$queryRaw<any[]>`
      SELECT id FROM trading_reports
      WHERE id = ${reportId}
        AND "batchId" = ANY(${batchIds}::text[])
      LIMIT 1
    `
    if (!reportCheck.length) return ok({ trades: [] })

    const trades = await prisma.$queryRaw<any[]>`
      SELECT
        ticket, symbol, "tradeType", "openTime", "closeTime",
        "openPrice", "closePrice", lots, profit, commission, swap, comment
      FROM trading_trades
      WHERE "reportId" = ${reportId}
      ORDER BY "closeTime" DESC
    `
    return ok({ trades })
  }

  // Get reports for all investor's batches — last 30 days
  const reports = await prisma.$queryRaw<any[]>`
    SELECT
      r.id, r."batchCode", r."reportType", r."reportDate",
      r."accountBalance", r."accountEquity",
      r."totalTrades", r."totalProfit", r."totalLoss", r."netPnl",
      r.platform, r."createdAt",
      COUNT(t.id)::int AS "tradesCount"
    FROM trading_reports r
    LEFT JOIN trading_trades t ON t."reportId" = r.id
    WHERE r."batchId" = ANY(${batchIds}::text[])
      AND r."reportDate" >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY r.id
    ORDER BY r."reportDate" DESC, r."reportType" DESC
  `

  return ok({ reports })
}