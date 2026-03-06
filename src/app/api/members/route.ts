import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { batchId, investorId, capitalAmount } = await req.json();
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    if (batch.status !== 'FORMING') {
      return NextResponse.json({ error: 'Batch is no longer accepting members' }, { status: 400 });
    }
    const existing = await prisma.batchMember.count({ where: { batchId } });
    if (existing >= batch.targetMembers) {
      return NextResponse.json({ error: 'Batch is full' }, { status: 400 });
    }
    const member = await prisma.batchMember.create({
      data: { batchId, investorId, capitalAmount: parseFloat(capitalAmount), sharePercent: 0 },
      include: { investor: true, batch: true },
    });
    await prisma.transaction.create({
      data: {
        investorId,
        batchMemberId: member.id,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: parseFloat(capitalAmount),
        reference: `DEP-${batch.batchCode}-${Date.now()}`,
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Investor already in batch' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to enroll member' }, { status: 500 });
  }
}
