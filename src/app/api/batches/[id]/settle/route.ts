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
    const { closingBalance, reportMonth, notes, platformFeePercent } = body

    if (!closingBalance || !reportMonth) {
      return error('closingBalance and reportMonth are required')
    }

    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: { members: { where: { status: 'ACTIVE' } } },
    })
    if (!batch) return notFound('Batch')
    if (batch.status !== 'ACTIVE') return error('Batch must be ACTIVE to settle')

    // Use actual collected capital (currentAmount) not targetCapital
    // This is the real opening balance for the trading account
    const openingBalance = parseFloat((batch.currentAmount ?? batch.targetCapital).toString())

    if (openingBalance <= 0) return error('Batch has no capital to distribute')

    // Platform fee: admin can pass custom rate, default 5%
    const platformFeeRate = platformFeePercent
      ? parseFloat(platformFeePercent) / 100
      : 0.05

    const withdrawingMembers = await prisma.batchMember.findMany({
      where: { batchId: params.id, status: 'WITHDRAWAL_REQUESTED' },
    })
    const withdrawingInvestorIds = withdrawingMembers.map(w => w.investorId)

    // Only distribute among ACTIVE members
    const members = batch.members.map(bm => ({
      batchMemberId: bm.id,
      investorId: bm.investorId,
      capitalAmount: parseFloat(bm.capitalAmount.toString()),
    }))

    if (!members.length) return error('No active members in this batch')

    const result = calculateMonthlyDistribution({
      openingBalance,
      closingBalance: Number(closingBalance),
      platformFeeRate,
      members,
      withdrawingInvestorIds,
    })

    const [monthlyReport] = await prisma.$transaction(async (tx) => {
      const mr = await tx.monthlyReport.create({
        data: {
          batchId: params.id,
          reportMonth: new Date(reportMonth),
          openingBalance: result.openingBalance,
          closingBalance: result.closingBalance,
          grossProfit: result.grossProfit,
          platformFeeRate,
          platformFee: result.platformFee,
          netProfit: result.netProfit,
          notes,
        },
      })

      const distribution = await tx.profitDistribution.create({
        data: {
          batchId: params.id,
          reportId: mr.id,
          totalProfit: result.netProfit,
          notes,
        },
      })

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

        await tx.transaction.create({
          data: {
            investorId: dist.investorId,
            batchMemberId: dist.batchMemberId,
            type: 'PROFIT_SHARE',
            status: 'CONFIRMED',
            amount: dist.profitShare,
            reference: `PROFIT-${batch.batchCode}-${mr.id.slice(-6)}`,
            notes: `Profit share for ${batch.name} — ${result.profitPercent}% return`,
            processedAt: new Date(),
          },
        })

        if (isWithdrawing) {
          await tx.transaction.create({
            data: {
              investorId: dist.investorId,
              batchMemberId: dist.batchMemberId,
              type: 'WITHDRAWAL',
              status: 'CONFIRMED',
              amount: dist.capitalAmount,
              reference: `WDRAW-${batch.batchCode}-${dist.investorId.slice(-6)}`,
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

      await tx.auditLog.create({
        data: {
          actorId: auth.memberId,
          actorEmail: auth.email,
          action: 'BATCH_SETTLED',
          entityType: 'Batch',
          metadata: {
            batchId: params.id,
            monthlyReportId: mr.id,
            openingBalance: result.openingBalance,
            closingBalance: result.closingBalance,
            grossProfit: result.grossProfit,
            platformFee: result.platformFee,
            netProfit: result.netProfit,
            profitPercent: result.profitPercent,
            memberCount: members.length,
            withdrawals: withdrawingInvestorIds.length,
          },
        },
      })

      return [mr]
    })

    return ok({
      monthlyReport,
      openingBalance: result.openingBalance,
      closingBalance: result.closingBalance,
      grossProfit: result.grossProfit,
      platformFee: result.platformFee,
      netProfit: result.netProfit,
      profitPercent: result.profitPercent,
      distributions: result.distributions,
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
