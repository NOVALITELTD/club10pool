// src/app/api/trading/report/route.ts
// Receives POST from MT4/MT5 EA — stores daily/weekly trading reports
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Authenticate EA using secret key ──
    const secret = body.secret || req.headers.get('x-ea-secret')
    if (!secret || secret !== process.env.TRADING_EA_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const {
      batchCode,
      reportType,    // 'DAILY' or 'WEEKLY'
      reportDate,    // 'YYYY-MM-DD'
      accountBalance,
      accountEquity,
      totalTrades,
      totalProfit,
      totalLoss,
      netPnl,
      platform,     // 'MT4' or 'MT5'
      trades,       // array of individual trade objects
    } = body

    // Validate required fields
    if (!batchCode || !reportType || !reportDate) {
      return error('batchCode, reportType, and reportDate are required')
    }
    if (!['DAILY', 'WEEKLY'].includes(reportType)) {
      return error('reportType must be DAILY or WEEKLY')
    }

    // Find the batch
    const batch = await prisma.$queryRaw<any[]>`
      SELECT id, "batchCode" FROM batches
      WHERE "batchCode" = ${batchCode} LIMIT 1
    `
    if (!batch.length) return error(`Batch ${batchCode} not found`, 404)
    const batchId = batch[0].id

    // Upsert report (replace if same batch+date+type)
    const reportRows = await prisma.$queryRaw<any[]>`
      INSERT INTO trading_reports (
        "batchId", "batchCode", "reportType", "reportDate",
        "accountBalance", "accountEquity",
        "totalTrades", "totalProfit", "totalLoss", "netPnl",
        "platform", "createdAt"
      )
      VALUES (
        ${batchId}, ${batchCode}, ${reportType}, ${reportDate}::date,
        ${parseFloat(accountBalance) || 0},
        ${parseFloat(accountEquity) || 0},
        ${parseInt(totalTrades) || 0},
        ${parseFloat(totalProfit) || 0},
        ${parseFloat(totalLoss) || 0},
        ${parseFloat(netPnl) || 0},
        ${platform || 'MT4'},
        NOW()
      )
      ON CONFLICT ("batchId", "reportDate", "reportType")
      DO UPDATE SET
        "accountBalance" = EXCLUDED."accountBalance",
        "accountEquity"  = EXCLUDED."accountEquity",
        "totalTrades"    = EXCLUDED."totalTrades",
        "totalProfit"    = EXCLUDED."totalProfit",
        "totalLoss"      = EXCLUDED."totalLoss",
        "netPnl"         = EXCLUDED."netPnl",
        "platform"       = EXCLUDED."platform",
        "createdAt"      = NOW()
      RETURNING id
    `
    const reportId = reportRows[0]?.id

    // Insert individual trades if provided
    if (reportId && Array.isArray(trades) && trades.length > 0) {
      // Delete old trades for this report first
      await prisma.$executeRaw`
        DELETE FROM trading_trades WHERE "reportId" = ${reportId}
      `
      // Insert new trades
      for (const t of trades) {
        await prisma.$executeRaw`
          INSERT INTO trading_trades (
            "reportId", "batchId", ticket, symbol,
            "tradeType", "openTime", "closeTime",
            "openPrice", "closePrice", lots,
            profit, commission, swap, comment
          )
          VALUES (
            ${reportId}, ${batchId},
            ${String(t.ticket || '')},
            ${String(t.symbol || '')},
            ${String(t.tradeType || t.type || 'BUY').toUpperCase()},
            ${t.openTime ? new Date(t.openTime) : null},
            ${t.closeTime ? new Date(t.closeTime) : null},
            ${parseFloat(t.openPrice) || 0},
            ${parseFloat(t.closePrice) || 0},
            ${parseFloat(t.lots) || 0},
            ${parseFloat(t.profit) || 0},
            ${parseFloat(t.commission) || 0},
            ${parseFloat(t.swap) || 0},
            ${String(t.comment || '')}
          )
        `
      }
    }

    return ok({
      message: `${reportType} report saved for ${batchCode}`,
      reportId,
      tradesCount: trades?.length || 0,
    })
  } catch (e: any) {
    console.error('Trading report error:', e)
    return error('Server error', 500)
  }
}