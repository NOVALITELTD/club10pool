// src/app/api/test/simulate-payment/route.ts
// ⚠️ REMOVE THIS FILE BEFORE GOING TO PRODUCTION
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ReferralPoolStatus } from '@prisma/client'

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}

export async function POST(req: NextRequest) {
  const { txRef } = await req.json()
  if (!txRef) return NextResponse.json({ error: 'txRef is required' }, { status: 400 })

  const payment = await prisma.payment.findUnique({
    where: { flwTxRef: txRef },
    include: {
      investor: { select: { fullName: true, email: true } },
      referralMember: { include: { referralPool: true } },
    },
  })

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status === 'SUCCESS') return NextResponse.json({ error: 'Payment already processed' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    // 1. Mark payment successful
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', flwTxId: `TEST-${Date.now()}` },
    })

    if (payment.referralMemberId && payment.referralMember) {
      // ── REFERRAL POOL PAYMENT ──
      const member = payment.referralMember
      const pool = member.referralPool

      await tx.referralMember.update({
        where: { id: member.id },
        data: { status: 'PAID', paidAt: new Date() },
      })

      const newAmount = Number(pool.currentAmount) + Number(member.contribution)
      const poolFull = newAmount >= Number(pool.targetAmount)

      await tx.referralPool.update({
        where: { id: pool.id },
        data: {
          currentAmount: newAmount,
          status: poolFull ? ReferralPoolStatus.FULL : ReferralPoolStatus.OPEN,
        },
      })

    } else if (payment.batchId) {
      // ── DIRECT BATCH PAYMENT ──
      const batch = await tx.batch.findUnique({ where: { id: payment.batchId! } })
      if (batch) {
        const capitalAmount = Number(payment.amountUSD)

        const existing = await tx.batchMember.findFirst({
          where: { batchId: payment.batchId!, investorId: payment.investorId },
        })

        const batchMember = existing
          ? await tx.batchMember.update({
              where: { id: existing.id },
              data: { status: 'ACTIVE', capitalAmount },
            })
          : await tx.batchMember.create({
              data: {
                batchId: payment.batchId!,
                investorId: payment.investorId,
                capitalAmount,
                sharePercent: 0,
                status: 'ACTIVE',
              },
            })

        const newAmount = Number(batch.currentAmount || 0) + capitalAmount
        const batchFull = newAmount >= Number(batch.targetAmount || batch.targetCapital)

        await tx.batch.update({
          where: { id: payment.batchId! },
          data: {
            currentAmount: newAmount,
            ...(batchFull ? { status: 'FULL' as any } : {}),
          },
        })

        await tx.transaction.create({
          data: {
            investorId: payment.investorId,
            batchMemberId: batchMember.id,
            type: 'DEPOSIT',
            amount: payment.amountUSD,
            status: 'CONFIRMED',
            notes: `[TEST] Simulated payment confirmation (ref: ${txRef})`,
          },
        })
      }
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Payment simulated successfully',
    txRef,
    investorId: payment.investorId,
    amountUSD: Number(payment.amountUSD),
    type: payment.batchId ? 'batch' : 'referral',
  })
}
