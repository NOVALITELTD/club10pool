// src/app/api/batches/[id]/join/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const { capitalAmount } = await req.json().catch(() => ({}))

    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: { _count: { select: { members: true } } },
    })
    if (!batch) return error('Batch not found', 404)
    if (!['FORMING', 'FULL'].includes(batch.status)) return error('Batch is not accepting members')

    // Check capacity via currentAmount vs targetAmount
    const target = Number(batch.targetAmount || batch.targetCapital || 0)
    const current = Number(batch.currentAmount || 0)
    if (target > 0 && current >= target) return error('Batch is full')

    // Validate contribution amount
    const min = Number(batch.minContribution || batch.contributionPerMember || 0)
    const max = Number(batch.maxContribution || batch.contributionPerMember || 0)
    const amount = capitalAmount ? Math.ceil(Number(capitalAmount) / 10) * 10 : min

    if (min > 0 && (amount < min || amount > max)) {
      return error(`Contribution must be between $${min} and $${max}`)
    }

    // Check if would overflow pool
    if (target > 0 && current + amount > target) {
      return error(`This amount would exceed the pool target. Maximum you can add: $${target - current}`)
    }

    // Check not already a member
    const existing = await prisma.batchMember.findFirst({
      where: { batchId: params.id, investorId: auth.memberId },
    })
    if (existing) {
      // If pending payment, allow re-initiating payment
      if (existing.status === 'ACTIVE') return error('You are already a member of this batch')
      return ok({ message: 'Pending payment', batchMemberId: existing.id, alreadyJoined: true })
    }

    // Create member with PENDING status until payment confirmed
    const member = await prisma.batchMember.create({
      data: {
        batchId: params.id,
        investorId: auth.memberId,
        capitalAmount: amount,
        sharePercent: 0,
        status: 'ACTIVE', // will be properly activated by webhook; keeping ACTIVE for backward compat
      },
    })

    return ok({ message: 'Joined batch — proceed to payment', batchMemberId: member.id }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
