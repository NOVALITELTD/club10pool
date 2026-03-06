import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const member = await prisma.batchMember.findUnique({ where: { id: params.id } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (member.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Withdrawal already requested' }, { status: 400 });
    }
    const updated = await prisma.batchMember.update({
      where: { id: params.id },
      data: { status: 'WITHDRAWAL_REQUESTED', withdrawalRequestedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to process withdrawal request' }, { status: 500 });
  }
}
