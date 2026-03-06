import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        members: { include: { investor: true } },
        monthlyReports: { orderBy: { reportMonth: 'desc' }, take: 1 },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(batches);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchCode, name, description, targetMembers, contributionPerMember, brokerName, tradingAccountId, startDate, endDate } = body;

    const batch = await prisma.batch.create({
      data: {
        batchCode,
        name,
        description,
        targetMembers: parseInt(targetMembers),
        contributionPerMember: parseFloat(contributionPerMember),
        targetCapital: parseInt(targetMembers) * parseFloat(contributionPerMember),
        brokerName,
        tradingAccountId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Batch code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}
