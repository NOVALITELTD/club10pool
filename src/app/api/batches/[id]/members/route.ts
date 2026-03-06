// src/app/api/batches/[id]/members/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'
import { calculateCapitalShares } from '@/lib/calculations'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { investorId, capitalAmount } = await req.json()
    if (!investorId) return error('investorId is required')

    const batch = await prisma.batch.findUnique({ where: { id: params.id } })
    if (!batch) return notFound('Batch')
    if (batch.status !== 'FORMING') return error('Can only add members to batches in FORMING status')

    const investor = await prisma.investor.findUnique({ where: { id: investorId } })
    if (!investor) return notFound('Investor')

    const currentCount = await prisma.batchMember.count({ where: { batchId: params.id } })
    if (currentCount >= batch.targetMembers) {
      return error(`Batch is full (${batch.targetMembers} members)`)
    }

    const capital = Number(capitalAmount ?? batch.contributionPerMember)

    // Create batch member
    const batchMember = await prisma.batchMember.create({
      data: {
        batchId: params.id,
        investorId,
        capitalAmount: capital,
        sharePercent: 0, // recalculated below
      },
    })

    // Recalculate all shares
    const allMembers = await prisma.batchMember.findMany({ where: { batchId: params.id } })
    const shares = calculateCapitalShares(allMembers.map(m => ({
      batchMemberId: m.id,
      investorId: m.investorId,
      capitalAmount: parseFloat(m.capitalAmount.toString()),
    })))

    // Update all shares
    for (const share of shares) {
      await prisma.batchMember.updateMany({
        where: { batchId: params.id, investorId: share.investorId },
        data: { sharePercent: share.sharePercent },
      })
    }

    // Record deposit transaction
    await prisma.transaction.create({
      data: {
        investorId,
        batchMemberId: batchMember.id,
        type: 'DEPOSIT',
        status: 'CONFIRMED',
        amount: capital,
        reference: `DEP-${batch.name.replace(/\s/g, '').toUpperCase()}-${investorId.slice(-6)}`,
        notes: `Capital deposit for ${batch.name}`,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId,
        actorEmail: auth.email,
        action: 'INVESTOR_ADDED_TO_BATCH',
        entityType: 'BatchMember',
        metadata: { batchId: params.id, investorId, capital },
      },
    })

    return ok(batchMember, 201)
  } catch (e: any) {
    if (e.code === 'P2002') return error('Investor is already in this batch')
    console.error(e)
    return error('Server error', 500)
  }
}
