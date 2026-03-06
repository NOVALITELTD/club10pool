import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalBatches, activeBatches, totalInvestors, totalDeposited, totalProfit, recentTransactions, batchSummary] = await Promise.all([
      prisma.batch.count(),
      prisma.batch.count({ where: { status: 'ACTIVE' } }),
      prisma.investor.count(),
      prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'PROFIT_SHARE', status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.transaction.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { investor: true } }),
      prisma.batch.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true } }, monthlyReports: { take: 1, orderBy: { reportMonth: 'desc' } } },
      }),
    ]);

    return NextResponse.json({
      totalBatches,
      activeBatches,
      totalInvestors,
      totalDeposited: totalDeposited._sum.amount ?? 0,
      totalProfitDistributed: totalProfit._sum.amount ?? 0,
      recentTransactions,
      batchSummary,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
