// src/app/api/withdrawals/admin/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  // Get all payout requests with withdrawalType and amounts
  const payouts = await prisma.$queryRaw<any[]>`
    SELECT
      pr.id, pr.amount, pr.status, pr."batchCode",
      pr."paymentDone", pr."paidAt", pr."createdAt",
      pr."walletAddress",
      pr."withdrawalType",
      pr."capitalAmount",
      pr."profitAmount",
      i."fullName" AS "investorName", i.email
    FROM payout_requests pr
    JOIN investors i ON i.id = pr."investorId"
    ORDER BY pr."batchCode" ASC, pr."createdAt" DESC
  `

  // Total members per batch (from withdrawal_requests — the active window)
  const batchTotals = await prisma.$queryRaw<any[]>`
    SELECT
      wr."batchCode",
      COUNT(wr.id) AS "totalMembers"
    FROM withdrawal_requests wr
    WHERE wr.active = true
    GROUP BY wr."batchCode"
  `
  const totalsMap: Record<string, number> = {}
  batchTotals.forEach((t: any) => { totalsMap[t.batchCode] = Number(t.totalMembers) })

  // Fetch live SOL/USD rate for NowPayments display
  let solRate: number | null = null
  try {
    const rateRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { next: { revalidate: 300 } })
    const rateData = await rateRes.json()
    solRate = rateData?.solana?.usd || null
  } catch { solRate = null }

  return ok({ payouts, batchTotals: totalsMap, solRate })
}
