import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden, error } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const batches = await prisma.batch.findMany({
      include: {
        _count: { select: { members: true } },
        monthlyReports: { orderBy: { reportMonth: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If investor, tag their membership on each batch
    if (!auth.isAdmin) {
      const memberships = await prisma.batchMember.findMany({
        where: { investorId: auth.memberId },
      })
      const memberMap = Object.fromEntries(memberships.map(m => [m.batchId, m]))
      return ok(batches.map((b: any) => ({ ...b, myMembership: memberMap[b.id] || null })))
    }

    return ok(batches)
  } catch (e) {
    return error('Failed to fetch batches', 500)
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const { batchCode, name, description, targetMembers, contributionPerMember, brokerName, tradingAccountId, startDate, endDate } = body

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
    })

    return ok(batch, 201)
  } catch (e: any) {
    if (e.code === 'P2002') return error('Batch code already exists', 409)
    return error('Failed to create batch', 500)
  }
}
