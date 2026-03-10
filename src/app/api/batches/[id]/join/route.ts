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
      include: { _count: { select: { members: { where: { status: 'ACTIVE' } } } } },
    })
    if (!batch) return error('Batch not found', 404)
    if (!['FORMING', 'FULL'].includes(batch.status)) return error('Batch is not accepting members')

    // Check capacity using only ACTIVE (paid) members
    const target = Number(batch.targetAmount || batch.targetCapital || 0)
    const current = Number(batch.currentAmount || 0)
    if (target > 0 && current >= target) return error('Batch is full')

    // Validate contribution amount
    const min = Number(batch.minContribution || batch.contributionPerMember || 10)
    const max = Number(batch.maxContribution || batch.contributionPerMember || 50)
    const amount = capitalAmount ? Math.ceil(Number(capitalAmount) / 10) * 10 : min

    if (amount < min || amount > max) {
      return error(`Contribution must be between $${min} and $${max}`)
    }
    if (target > 0 && current + amount > target) {
      return error(`Maximum you can contribute: $${target - current}`)
    }

    // Check for existing ACTIVE membership only — pending/failed payments don't block
    const activeMember = await prisma.batchMember.findFirst({
      where: { batchId: params.id, investorId: auth.memberId, status: 'ACTIVE' },
    })
    if (activeMember) return error('You are already an active member of this batch')

    // Check for a pending payment already in progress
    const pendingPayment = await prisma.payment.findFirst({
      where: { batchId: params.id, investorId: auth.memberId, status: 'PENDING' },
    })

    if (pendingPayment) {
      // Allow re-initiating — just return the existing pending payment info
      return ok({ message: 'Proceed to payment', capitalAmount: amount, resuming: true })
    }

    // Just validate — BatchMember will be created by the webhook after payment
    return ok({ message: 'Eligible to join — proceed to payment', capitalAmount: amount })

  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
