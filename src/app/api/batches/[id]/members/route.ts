// src/app/api/batches/[id]/members/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'
import { calculateCapitalShares } from '@/lib/calculations'

// POST /api/batches/:id/members — add member to batch
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { memberId, capitalContributed } = await req.json()
    if (!memberId) return error('memberId is required')

    const batch = await prisma.batch.findUnique({ where: { id: params.id } })
    if (!batch) return notFound('Batch')
    if (batch.status !== 'FORMING') return error('Can only add members to batches in FORMING status')

    const member = await prisma.member.findUnique({ where: { id: memberId } })
    if (!member) return notFound('Member')

    const currentCount = await prisma.batchMember.count({ where: { batchId: params.id } })
    if (currentCount >= batch.targetMembers) {
      return error(`Batch is full (${batch.targetMembers} members)`)
    }

    const capital = Number(capitalContributed ?? batch.capitalPerMember)

    // Create batch member
    const batchMember = await prisma.batchMember.create({
      data: {
        batchId: params.id,
        memberId,
        capitalContributed: capital,
        capitalShare: 0, // will be recalculated below
      },
    })

    // Recalculate all shares
    const allMembers = await prisma.batchMember.findMany({ where: { batchId: params.id } })
    const shares = calculateCapitalShares(allMembers.map(m => ({
      batchMemberId: m.id,
      memberId: m.memberId,
      capitalContributed: parseFloat(m.capitalContributed.toString()),
    })))

    // Update all shares
    for (const share of shares) {
      await prisma.batchMember.updateMany({
        where: { batchId: params.id, memberId: share.memberId },
        data: { capitalShare: share.capitalShare },
      })
    }

    // Record deposit transaction
    await prisma.transaction.create({
      data: {
        memberId,
        type: 'DEPOSIT',
        amount: capital,
        description: `Capital deposit for ${batch.name}`,
        reference: `DEP-${batch.name.replace(/\s/g, '').toUpperCase()}-${memberId.slice(-6)}`,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId, actorEmail: auth.email,
        action: 'MEMBER_ADDED_TO_BATCH', entityType: 'BatchMember', entityId: batchMember.id,
        metadata: { batchId: params.id, memberId, capital },
      },
    })

    return ok(batchMember, 201)
  } catch (e: any) {
    if (e.code === 'P2002') return error('Member is already in this batch')
    console.error(e)
    return error('Server error', 500)
  }
}
