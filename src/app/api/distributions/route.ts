import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();

    const report = await prisma.monthlyReport.findUnique({
      where: { id: reportId },
      include: {
        batch: {
          include: {
            members: { where: { status: { in: ['ACTIVE', 'WITHDRAWAL_REQUESTED'] } } },
          },
        },
      },
    });

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (report.distribution) return NextResponse.json({ error: 'Distribution already done for this report' }, { status: 409 });

    const members = report.batch.members;
    const totalCapital = members.reduce((sum: number, m: any) => sum + parseFloat(m.capitalAmount.toString()), 0);
    const netProfit = parseFloat(report.netProfit.toString());

    const distribution = await prisma.profitDistribution.create({
      data: {
        batchId: report.batchId,
        reportId: report.id,
        totalProfit: netProfit,
        shares: {
          create: members.map((m: any) => {
            const capital = parseFloat(m.capitalAmount.toString());
            const pct = totalCapital > 0 ? (capital / totalCapital) * 100 : 0;
            const profit = (pct / 100) * netProfit;
            return {
              batchMemberId: m.id,
              capitalAmount: capital,
              sharePercent: pct,
              profitAmount: profit,
            };
          }),
        },
      },
      include: { shares: { include: { batchMember: { include: { investor: true } } } } },
    });

    // Create profit transactions
    for (const share of distribution.shares) {
      await prisma.transaction.create({
        data: {
          investorId: share.batchMember.investorId,
          batchMemberId: share.batchMemberId,
          type: 'PROFIT_SHARE',
          status: 'CONFIRMED',
          amount: share.profitAmount,
          reference: `DIST-${reportId.slice(-6)}-${share.batchMemberId.slice(-4)}`,
          processedAt: new Date(),
        },
      });
    }

    // Process withdrawals
    const withdrawingMembers = members.filter((m: any) => m.status === 'WITHDRAWAL_REQUESTED');
    for (const m of withdrawingMembers) {
      await prisma.batchMember.update({
        where: { id: m.id },
        data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
      });
      await prisma.transaction.create({
        data: {
          investorId: m.investorId,
          batchMemberId: m.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          amount: m.capitalAmount,
          reference: `WTHD-${m.id.slice(-6)}`,
        },
      });
    }

    return NextResponse.json(distribution, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to run distribution' }, { status: 500 });
  }
}
