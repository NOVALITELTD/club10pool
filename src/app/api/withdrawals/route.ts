// src/app/api/withdrawals/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

// GET /api/withdrawals — list (admin sees all, member sees own)
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const requests = await prisma.withdrawalRequest.findMany({
    where: requireAdmin(auth) ? undefined : { memberId: auth.memberId },
    include: {
      member: { select: { fullName: true, email: true } },
    },
    orderBy: { requestedAt: 'desc' },
  })

  return ok(requests)
}

// POST /api/withdrawals — member requests withdrawal at month-end
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const { batchId } = await req.json()
    if (!batchId) return error('batchId is required')

    // Verify member is in batch
    const batchMember = await prisma.batchMember.findFirst({
      where: { batchId, memberId: auth.memberId, withdrawnAt: null },
    })
    if (!batchMember) return error('You are not an active member of this batch')

    // Check batch is active
    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch || batch.status !== 'ACTIVE') return error('Batch is not currently active')

    // Check no existing pending request
    const existing = await prisma.withdrawalRequest.findFirst({
      where: { memberId: auth.memberId, batchId, status: { in: ['PENDING', 'APPROVED'] } },
    })
    if (existing) return error('You already have a pending withdrawal request for this batch')

    const request = await prisma.withdrawalRequest.create({
      data: {
        memberId: auth.memberId,
        batchId,
        status: 'PENDING',
      },
    })

    return ok(request, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
