import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const investor = await prisma.investor.findUnique({
      where: { id: params.id },
      include: {
        memberships: { include: { batch: true, profitShares: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(investor);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch investor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const investor = await prisma.investor.update({ where: { id: params.id }, data: body });
    return NextResponse.json(investor);
  } catch {
    return NextResponse.json({ error: 'Failed to update investor' }, { status: 500 });
  }
}
