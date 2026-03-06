// src/app/api/withdrawals/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

// GET /api/withdrawals — list members with withdrawal requested status
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const members = await prisma.batchMember.findMany({
    where: requireAdmin(auth)
      ? { status: 'WITHDRAWAL_REQUESTED' }
      : { investorId: auth.memberId, status: 'WITHDRAWAL_REQUESTED' },
    include: {
      investor: { select: { fullName: true, email: true } },
      batch: { select: { id: true, name: true, status: true } },
    },
    orderBy: { withdrawalRequestedAt: 'desc' },
  })
  return ok(members)
}

// POST /api/withdrawals — investor requests withdrawal at month-end
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const { batchId } = await req.json()
    if (!batchId) return error('batchId is required')

    // Verify investor is active in batch
    const batchMember = await prisma.batchMember.findFirst({
      where: { batchId, investorId: auth.memberId, status: 'ACTIVE' },
    })
    if (!batchMember) return error('You are not an active member of this batch')

    // Check batch is active
    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch || batch.status !== 'ACTIVE') return error('Batch is not currently active')

    // Update status to WITHDRAWAL_REQUESTED
    const updated = await prisma.batchMember.update({
      where: { id: batchMember.id },
      data: {
        status: 'WITHDRAWAL_REQUESTED',
        withdrawalRequestedAt: new Date(),
      },
    })

    return ok(updated, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
