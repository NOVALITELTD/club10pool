// src/app/api/withdrawals/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'

// PATCH /api/withdrawals/:id — admin approves or rejects
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { action, adminNotes } = await req.json()
    if (!['approve', 'reject'].includes(action)) return error('action must be approve or reject')

    const request = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } })
    if (!request) return notFound('Withdrawal request')
    if (request.status !== 'PENDING') return error('Request is not pending')

    const updated = await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        adminNotes,
        processedAt: action === 'reject' ? new Date() : null,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId, actorEmail: auth.email,
        action: `WITHDRAWAL_${action.toUpperCase()}D`,
        entityType: 'WithdrawalRequest', entityId: params.id,
        metadata: { adminNotes },
      },
    })

    return ok(updated)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
