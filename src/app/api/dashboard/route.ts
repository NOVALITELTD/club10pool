//src/app/api/dashboard/route.ts
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

    return ok({
      totalBatches,
      activeBatches,
      totalInvestors,
      totalDeposited: Number(totalDeposited._sum.amount ?? 0),
      totalProfitDistributed: Number(totalProfit._sum.amount ?? 0),
      recentTransactions,
      batchSummary,
    })
  } catch (e) {
    console.error(e)
    return error('Failed to fetch dashboard data', 500)
  }
}
