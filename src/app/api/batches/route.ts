// src/app/api/batches/route.ts
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

    if (auth.isAdmin) return ok(batches)

    // For investors: tag membership and filter out batches in categories
    // where the investor is already in a referral pool
    const memberships = await prisma.batchMember.findMany({
      where: { investorId: auth.memberId },
    })
    const memberMap = Object.fromEntries(memberships.map(m => [m.batchId, m]))

    // Get categories this investor is already in via referral pools
    const referralMemberships = await prisma.referralMember.findMany({
      where: {
        investorId: auth.memberId,
        status: { in: ['PENDING_PAYMENT', 'PAID', 'ACTIVE'] },
      },
      include: { referralPool: { select: { category: true } } },
    })
    const referralCategories = new Set(referralMemberships.map(rm => rm.referralPool.category))

    return ok(
      batches
        .filter((b: any) => {
          // Always show batches the investor is already a member of
          if (memberMap[b.id]) return true
          // Hide batches in categories where investor is in a referral pool
          if (b.category && referralCategories.has(b.category)) return false
          return true
        })
        .map((b: any) => ({ ...b, myMembership: memberMap[b.id] || null }))
    )
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
        batchCode, name, description,
        targetMembers: parseInt(targetMembers),
        contributionPerMember: parseFloat(contributionPerMember),
        targetCapital: parseInt(targetMembers) * parseFloat(contributionPerMember),
        brokerName, tradingAccountId,
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
