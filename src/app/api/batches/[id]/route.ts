import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: { investor: true, profitShares: true, transactions: { orderBy: { createdAt: 'desc' } } },
        },
        monthlyReports: { orderBy: { reportMonth: 'desc' } },
        distributions: { include: { shares: { include: { batchMember: { include: { investor: true } } } } } },
      },
    });
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json(batch);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const batch = await prisma.batch.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(batch);
  } catch {
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}
