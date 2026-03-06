// src/app/api/batches/[id]/settle/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'
import { calculateMonthlyDistribution } from '@/lib/calculations'

/**
 * POST /api/batches/:id/settle
 * 
 * Processes month-end settlement for a batch.
 * - Records monthly result (P&L)
 * - Calculates each member's profit share
 * - Creates payout records
 * - Marks withdrawing members
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const { closingBalance, periodStart, periodEnd, notes } = body

    if (!closingBalance || !periodStart || !periodEnd) {
      return error('closingBalance, periodStart, and periodEnd are required')
    }

    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: { batchMembers: true },
    })
    if (!batch) return notFound('Batch')
    if (batch.status !== 'ACTIVE') return error('Batch must be ACTIVE to settle')

    // Find pending withdrawal requests
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { batchId: params.id, status: 'APPROVED' },
    })
    const withdrawingMemberIds = withdrawalRequests.map(w => w.memberId)

    const members = batch.batchMembers.map(bm => ({
      batchMemberId: bm.id,
      memberId: bm.memberId,
      capitalContributed: parseFloat(bm.capitalContributed.toString()),
    }))

    const result = calculateMonthlyDistribution({
      openingBalance: parseFloat(batch.totalCapital.toString()),
      closingBalance: Number(closingBalance),
      managementFeePercent: parseFloat(batch.managementFeePercent.toString()),
      members,
      withdrawingMemberIds,
    })

    // Persist in a transaction
    const [monthlyResult] = await prisma.$transaction(async (tx) => {
      // 1. Create monthly result
      const mr = await tx.monthlyResult.create({
        data: {
          batchId: params.id,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          openingBalance: result.openingBalance,
          closingBalance: result.closingBalance,
          grossProfit: result.grossProfit,
          managementFee: result.managementFee,
          netProfit: result.netProfit,
          profitPercent: result.profitPercent,
          notes,
          processedAt: new Date(),
        },
      })

      // 2. Create payouts
      for (const dist of result.distributions) {
        const isWithdrawing = withdrawingMemberIds.includes(dist.memberId)
        await tx.payout.create({
          data: {
            batchId: params.id,
            batchMemberId: dist.batchMemberId,
            monthlyResultId: mr.id,
            principalAmount: isWithdrawing ? dist.capitalContributed : 0,
            profitAmount: dist.profitShare,
            totalAmount: dist.totalPayout,
            status: 'PENDING',
          },
        })

        // 3. Record profit credit transaction
        await tx.transaction.create({
          data: {
            memberId: dist.memberId,
            type: 'PROFIT_CREDIT',
            amount: dist.profitShare,
            description: `Profit share for ${batch.name} — period ending ${periodEnd}`,
            reference: `PROFIT-${batch.name.replace(/\s/g, '')}-${mr.id.slice(-6)}`,
          },
        })

        // 4. If withdrawing: record withdrawal transaction
        if (isWithdrawing) {
          await tx.transaction.create({
            data: {
              memberId: dist.memberId,
              type: 'WITHDRAWAL',
              amount: dist.capitalContributed,
              description: `Capital withdrawal from ${batch.name}`,
              reference: `WDRAW-${batch.name.replace(/\s/g, '')}-${dist.memberId.slice(-6)}`,
            },
          })

          // Mark batch member as withdrawn
          await tx.batchMember.update({
            where: { id: dist.batchMemberId },
            data: { withdrawnAt: new Date() },
          })
        }
      }

      // 5. Process withdrawal requests
      if (withdrawingMemberIds.length > 0) {
        await tx.withdrawalRequest.updateMany({
          where: { batchId: params.id, status: 'APPROVED' },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
      }

      // 6. Audit
      await tx.auditLog.create({
        data: {
          actorId: auth.memberId, actorEmail: auth.email,
          action: 'BATCH_SETTLED', entityType: 'Batch', entityId: params.id,
          metadata: {
            monthlyResultId: mr.id,
            grossProfit: result.grossProfit,
            netProfit: result.netProfit,
            withdrawals: withdrawingMemberIds.length,
          },
        },
      })

      return [mr]
    })

    return ok({ monthlyResult, distributions: result.distributions })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
