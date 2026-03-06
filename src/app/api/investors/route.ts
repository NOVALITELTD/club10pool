import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const investors = await prisma.investor.findMany({
      include: {
        memberships: { include: { batch: true } },
        _count: { select: { memberships: true, transactions: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    return NextResponse.json(investors);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const investor = await prisma.investor.create({ data: body });
    return NextResponse.json(investor, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create investor' }, { status: 500 });
  }
}
