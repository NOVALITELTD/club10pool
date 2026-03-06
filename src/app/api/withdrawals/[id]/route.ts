// src/app/api/withdrawals/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'

// PATCH /api/withdrawals/:id — admin approves (keeps WITHDRAWAL_REQUESTED) or rejects (reverts to ACTIVE)
// :id is the batchMember id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { action, adminNotes } = await req.json()
    if (!['approve', 'reject'].includes(action)) return error('action must be approve or reject')

    const batchMember = await prisma.batchMember.findUnique({
      where: { id: params.id },
      include: { investor: true },
    })
    if (!batchMember) return notFound('Withdrawal request')
    if (batchMember.status !== 'WITHDRAWAL_REQUESTED') return error('No pending withdrawal request for this member')

    const updated = await prisma.batchMember.update({
      where: { id: params.id },
      data: action === 'reject'
        ? { status: 'ACTIVE', withdrawalRequestedAt: null }
        : {}, // approved: leave as WITHDRAWAL_REQUESTED, will be WITHDRAWN at settlement
    })

    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId,
        actorEmail: auth.email,
        action: `WITHDRAWAL_${action.toUpperCase()}D`,
        entityType: 'BatchMember',
        metadata: { batchMemberId: params.id, adminNotes },
      },
    })

    return ok(updated)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
