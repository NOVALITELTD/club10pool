// src/app/api/batches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            investor: true,
            profitShares: true,
            transactions: { orderBy: { createdAt: 'desc' } },
          },
        },
        monthlyReports: { orderBy: { reportMonth: 'desc' } },
        distributions: {
          include: {
            shares: { include: { batchMember: { include: { investor: true } } } },
          },
        },
      },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    return NextResponse.json(batch)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()

    // Whitelist allowed fields — never accept freeform body directly
    const allowed: Record<string, any> = {}
    const whitelist = ['status', 'name', 'description', 'brokerName', 'startDate', 'endDate', 'actualEndDate', 'notes']
    for (const key of whitelist) {
      if (key in body) allowed[key] = body[key]
    }

    const batch = await prisma.batch.update({
      where: { id: params.id },
      data: allowed,
    })
    return ok(batch)
  } catch {
    return error('Failed to update batch', 500)
  }
}
