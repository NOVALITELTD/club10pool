import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  try {
    const reports = await prisma.monthlyReport.findMany({
      where: batchId ? { batchId } : {},
      include: { batch: true, distribution: true },
      orderBy: { reportMonth: 'desc' },
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, reportMonth, openingBalance, closingBalance, platformFeeRate = 0, notes } = body;

    const opening = parseFloat(openingBalance);
    const closing = parseFloat(closingBalance);
    const feeRate = parseFloat(platformFeeRate);
    const gross = closing - opening;
    const fee = gross * feeRate;
    const net = gross - fee;

    const report = await prisma.monthlyReport.create({
      data: {
        batchId,
        reportMonth: new Date(reportMonth),
        openingBalance: opening,
        closingBalance: closing,
        grossProfit: gross,
        platformFeeRate: feeRate,
        platformFee: fee,
        netProfit: net,
        notes,
      },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Report for this month already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
