// src/app/api/batches/[id]/settle/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'
import { calculateMonthlyDistribution } from '@/lib/calculations'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const { closingBalance, reportMonth, notes } = body

    if (!closingBalance || !reportMonth) {
      return error('closingBalance and reportMonth are required')
    }

    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: { members: true },
    })
    if (!batch) return notFound('Batch')
    if (batch.status !== 'ACTIVE') return error('Batch must be ACTIVE to settle')

    // Find withdrawing members (WITHDRAWAL_REQUESTED status)
    const withdrawingMembers = await prisma.batchMember.findMany({
      where: { batchId: params.id, status: 'WITHDRAWAL_REQUESTED' },
    })
    const withdrawingInvestorIds = withdrawingMembers.map(w => w.investorId)

    const members = batch.members.map(bm => ({
      batchMemberId: bm.id,
      investorId: bm.investorId,
      capitalAmount: parseFloat(bm.capitalAmount.toString()),
    }))

    const result = calculateMonthlyDistribution({
      openingBalance: parseFloat(batch.targetCapital.toString()),
      closingBalance: Number(closingBalance),
      platformFeeRate: parseFloat(batch.contributionPerMember.toString()) / 100,
      members,
      withdrawingInvestorIds,
    })

    const [monthlyReport] = await prisma.$transaction(async (tx) => {
      // 1. Create monthly report
      const mr = await tx.monthlyReport.create({
        data: {
          batchId: params.id,
          reportMonth: new Date(reportMonth),
          openingBalance: result.openingBalance,
          closingBalance: result.closingBalance,
          grossProfit: result.grossProfit,
          platformFeeRate: 0.05,
          platformFee: result.platformFee,
          netProfit: result.netProfit,
          notes,
        },
      })

      // 2. Create profit distribution
      const distribution = await tx.profitDistribution.create({
        data: {
          batchId: params.id,
          reportId: mr.id,
          totalProfit: result.netProfit,
          notes,
        },
      })

      // 3. Create profit shares and transactions
      for (const dist of result.distributions) {
        const isWithdrawing = withdrawingInvestorIds.includes(dist.investorId)

        await tx.profitShare.create({
          data: {
            distributionId: distribution.id,
            batchMemberId: dist.batchMemberId,
            capitalAmount: dist.capitalAmount,
            sharePercent: dist.sharePercent,
            profitAmount: dist.profitShare,
          },
        })

        // Record profit transaction
        await tx.transaction.create({
          data: {
            investorId: dist.investorId,
            batchMemberId: dist.batchMemberId,
            type: 'PROFIT_SHARE',
            status: 'CONFIRMED',
            amount: dist.profitShare,
            reference: `PROFIT-${batch.name.replace(/\s/g, '')}-${mr.id.slice(-6)}`,
            notes: `Profit share for ${batch.name}`,
            processedAt: new Date(),
          },
        })

        // If withdrawing: record withdrawal transaction and update status
        if (isWithdrawing) {
          await tx.transaction.create({
            data: {
              investorId: dist.investorId,
              batchMemberId: dist.batchMemberId,
              type: 'WITHDRAWAL',
              status: 'CONFIRMED',
              amount: dist.capitalAmount,
              reference: `WDRAW-${batch.name.replace(/\s/g, '')}-${dist.investorId.slice(-6)}`,
              notes: `Capital withdrawal from ${batch.name}`,
              processedAt: new Date(),
            },
          })

          await tx.batchMember.update({
            where: { id: dist.batchMemberId },
            data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
          })
        }
      }

      // 4. Audit
      await tx.auditLog.create({
        data: {
          actorId: auth.memberId,
          actorEmail: auth.email,
          action: 'BATCH_SETTLED',
          entityType: 'Batch',
          metadata: {
            batchId: params.id,
            monthlyReportId: mr.id,
            grossProfit: result.grossProfit,
            netProfit: result.netProfit,
            withdrawals: withdrawingInvestorIds.length,
          },
        },
      })

      return [mr]
    })

    return ok({ monthlyReport, distributions: result.distributions })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
