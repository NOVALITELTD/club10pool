// src/app/api/dashboard/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  try {
    const [
      totalBatches,
      activeBatches,
      totalInvestors,
      totalDeposited,
      totalProfit,
      recentTransactions,
      batchSummary,
    ] = await Promise.all([
      prisma.batch.count(),
      prisma.batch.count({ where: { status: 'ACTIVE' } }),
      prisma.investor.count(),
      prisma.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'PROFIT_SHARE', status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { investor: true },
      }),
      prisma.batch.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true } },
          monthlyReports: { take: 1, orderBy: { reportMonth: 'desc' } },
        },
      }),
    ])

    // Active capital: sum of capitalAmount for all ACTIVE batch members
    const activeCapitalRows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(bm."capitalAmount"), 0) AS total
      FROM batch_members bm
      JOIN batches b ON b.id = bm."batchId"
      WHERE b.status = 'ACTIVE'
        AND bm.status = 'ACTIVE'
    `
    const activeCapital = parseFloat(activeCapitalRows[0]?.total || '0')

    // All-time total capital deposited: sum of all CONFIRMED batch member capitals
    const allTimeCapitalRows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(bm."capitalAmount"), 0) AS total
      FROM batch_members bm
      WHERE bm.status IN ('ACTIVE', 'WITHDRAWN', 'WITHDRAWAL_REQUESTED')
    `
    const allTimeCapital = parseFloat(allTimeCapitalRows[0]?.total || '0')

    // Capital by category (active batches only)
    const capitalByCategoryRows = await prisma.$queryRaw<{ category: string; total: string }[]>`
      SELECT b.category, COALESCE(SUM(bm."capitalAmount"), 0) AS total
      FROM batch_members bm
      JOIN batches b ON b.id = bm."batchId"
      WHERE b.status = 'ACTIVE'
        AND bm.status = 'ACTIVE'
        AND b.category IS NOT NULL
      GROUP BY b.category
    `
    const capitalByCategory: Record<string, number> = {}
    capitalByCategoryRows.forEach(row => {
      capitalByCategory[row.category] = parseFloat(row.total)
    })

    // All-time capital by category
    const allTimeByCategoryRows = await prisma.$queryRaw<{ category: string; total: string }[]>`
      SELECT b.category, COALESCE(SUM(bm."capitalAmount"), 0) AS total
      FROM batch_members bm
      JOIN batches b ON b.id = bm."batchId"
      WHERE bm.status IN ('ACTIVE', 'WITHDRAWN', 'WITHDRAWAL_REQUESTED')
        AND b.category IS NOT NULL
      GROUP BY b.category
    `
    const allTimeByCategory: Record<string, number> = {}
    allTimeByCategoryRows.forEach(row => {
      allTimeByCategory[row.category] = parseFloat(row.total)
    })

    return ok({
      totalBatches,
      activeBatches,
      totalInvestors,
      totalDeposited: Number(totalDeposited._sum.amount ?? 0),
      totalProfitDistributed: Number(totalProfit._sum.amount ?? 0),
      recentTransactions,
      batchSummary,
      // New capital stats
      activeCapital,
      allTimeCapital,
      capitalByCategory,
      allTimeByCategory,
    })
  } catch (e) {
    console.error(e)
    return error('Failed to fetch dashboard data', 500)
  }
}
