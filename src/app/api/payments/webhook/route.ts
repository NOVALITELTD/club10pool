// src/app/api/payments/webhook/route.ts
// NowPayments IPN callback — set this URL in NowPayments dashboard → Store Settings → IPN URL
// https://club10pool.vercel.app/api/payments/webhook

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ReferralPoolStatus } from '@prisma/client'
import crypto from 'crypto'

const NP_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || ''

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}

// Verify NowPayments IPN signature
function verifySignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha512', NP_IPN_SECRET)
  hmac.update(body)  
  return hmac.digest('hex') === signature
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-nowpayments-sig') || ''
  const rawBody = await req.text()

  if (!verifySignature(rawBody, signature)) {
    console.error('Invalid NowPayments IPN signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(rawBody)
  const { payment_status, order_id: txRef, payment_id: npPaymentId, actually_paid, pay_currency } = data

  // Only process terminal statuses
  if (!['finished', 'partially_paid', 'failed', 'expired'].includes(payment_status)) {
    return NextResponse.json({ received: true })
  }

  const isSuccess = payment_status === 'finished'

  if (!isSuccess) {
    // Mark as failed
    await prisma.payment.updateMany({
      where: { flwTxRef: txRef, status: 'PENDING' },
      data: { status: 'FAILED', flwTxId: String(npPaymentId) },
    })
    return NextResponse.json({ received: true })
  }

  const payment = await prisma.payment.findUnique({
    where: { flwTxRef: txRef },
    include: {
      investor: { select: { fullName: true, email: true } },
      referralMember: { include: { referralPool: true } },
    },
  })

  if (!payment || payment.status === 'SUCCESS') {
    return NextResponse.json({ received: true }) // Already processed
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark payment successful
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', flwTxId: String(npPaymentId) },
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

      if (poolFull) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@club10pool.com',
          subject: `🎯 Referral Pool Full — ${CATEGORY_LABELS[pool.category]} (${pool.referralCode})`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
            <h2>Referral Pool Ready for Activation</h2>
            <p>Pool <strong>${pool.referralCode}</strong> (${CATEGORY_LABELS[pool.category]}) has reached $${Number(pool.targetAmount).toLocaleString()}.</p>
            <p>Log in to the admin panel to activate and input MT4/MT5 trading details.</p>
          </div>`,
        })
      }

    } else if (payment.batchId) {
      // ── DIRECT BATCH PAYMENT ──
      const batchMember = await tx.batchMember.findFirst({
        where: { batchId: payment.batchId, investorId: payment.investorId },
      })

      if (batchMember) {
        await tx.batchMember.update({
          where: { id: batchMember.id },
          data: { status: 'ACTIVE' },
        })

        const batch = await tx.batch.findUnique({ where: { id: payment.batchId! } })
        if (batch) {
          const newAmount = Number(batch.currentAmount || 0) + Number(batchMember.capitalAmount)
          const batchFull = newAmount >= Number(batch.targetAmount || batch.targetCapital)

          await tx.batch.update({
            where: { id: payment.batchId! },
            data: {
              currentAmount: newAmount,
              ...(batchFull ? { status: 'FULL' as any } : {}),
            },
          })

          if (batchFull) {
            await sendEmail({
              to: process.env.ADMIN_EMAIL || 'admin@club10pool.com',
              subject: `🎯 Batch Full — ${batch.name} (${batch.batchCode})`,
              html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                <h2>Batch Ready for Activation</h2>
                <p>Batch <strong>${batch.name}</strong> has reached its target. Log in to activate and input MT4/MT5 details.</p>
              </div>`,
            })
          }
        }

        // Transaction record
        await tx.transaction.create({
          data: {
            investorId: payment.investorId,
            batchMemberId: batchMember.id,
            type: 'DEPOSIT',
            amount: payment.amountUSD,
            status: 'CONFIRMED',
            notes: `USDT payment confirmed via NowPayments (ref: ${txRef})`,
          },
        })
      }
    }
  })

  // Confirmation email to investor
  await sendEmail({
    to: payment.investor.email,
    subject: '✓ Payment Confirmed — Club10 Pool',
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00d4aa,#0099aa);padding:24px 28px;">
        <h2 style="margin:0;color:#000;">✓ Payment Confirmed</h2>
      </div>
      <div style="padding:28px;">
        <p>Hi <strong>${payment.investor.fullName}</strong>,</p>
        <p>Your payment of <strong style="color:#c9a84c;">$${Number(payment.amountUSD).toLocaleString()}</strong> has been confirmed via USDT.</p>
        <p>You are now an active member of your investment pool. Log in to your dashboard to view your status and trading details.</p>
        <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
      </div>
    </div>`,
  })

  return NextResponse.json({ received: true })
}
