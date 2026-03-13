// src/app/api/batches/route.ts
import { NextRequest } from 'next/server'
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

    // Admin sees everything as-is
    if (auth.isAdmin) return ok(batches)

    // Get investor's direct batch memberships (exclude withdrawn)
    const memberships = await prisma.batchMember.findMany({
      where: {
        investorId: auth.memberId,
        status: { in: ['ACTIVE', 'WITHDRAWAL_REQUESTED'] },
      },
      include: {
        batch: { select: { category: true } },
      },
    })

    const memberMap = Object.fromEntries(memberships.map(m => [m.batchId, m]))

    // Categories the investor already occupies via direct batch membership
    const occupiedBatchCategories = new Set(
      memberships
        .map(m => m.batch.category)
        .filter(Boolean)
    )

    // Categories the investor already occupies via referral pool membership
    const referralMemberships = await prisma.referralMember.findMany({
      where: {
        investorId: auth.memberId,
        status: { in: ['PENDING_PAYMENT', 'PAID', 'ACTIVE'] },
      },
      include: { referralPool: { select: { category: true } } },
    })

    const referralCategories = new Set(
      referralMemberships.map(rm => rm.referralPool.category)
    )

    const allOccupiedCategories = [
      ...occupiedBatchCategories,
      ...referralCategories,
    ]

    return ok(
      batches
        .filter((b: any) => {
          // Always show batches the investor is already a direct member of
          if (memberMap[b.id]) return true

          // Hide batches whose category investor already occupies
          if (b.category && allOccupiedCategories.includes(b.category)) return false

          return true
        })
        .map((b: any) => ({
          ...b,
          myMembership: memberMap[b.id] || null,
        }))
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
    const {
      batchCode, name, description, category,
      targetMembers, contributionPerMember,
      minContribution, maxContribution,
      targetCapital, targetAmount,
      brokerName, tradingAccountId, startDate, endDate,
    } = body

    const members = parseInt(targetMembers) || 10
    const contrib = parseFloat(contributionPerMember) || parseFloat(minContribution) || 0
    const capital = parseFloat(targetCapital) || parseFloat(targetAmount) || members * contrib

    const batch = await prisma.batch.create({
      data: {
        batchCode, name, description,
        category: category || null,
        targetMembers: members,
        contributionPerMember: contrib,
        targetCapital: capital,
        targetAmount: capital,
        minContribution: parseFloat(minContribution) || contrib,
        maxContribution: parseFloat(maxContribution) || contrib,
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
