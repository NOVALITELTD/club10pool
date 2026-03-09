// src/app/api/payments/webhook/route.ts
// POST /api/payments/webhook
// Flutterwave webhook — called when payment is completed/failed
// Set this URL in your Flutterwave dashboard: https://yourdomain.com/api/payments/webhook

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

const FLW_SECRET_HASH = process.env.FLW_WEBHOOK_SECRET || 'your-webhook-secret-hash'
const FLW_SECRET_KEY  = process.env.FLW_SECRET_KEY || 'FLWSECK_TEST-XXXX'

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}

export async function POST(req: NextRequest) {
  // Verify Flutterwave webhook signature
  const signature = req.headers.get('verif-hash')
  if (!signature || signature !== FLW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = await req.json()
  const { event, data } = payload

  if (event !== 'charge.completed') {
    return NextResponse.json({ received: true })
  }

  const { tx_ref, id: flwTxId, status, amount, currency } = data

  if (status !== 'successful' || currency !== 'NGN') {
    // Mark payment as failed
    await prisma.payment.updateMany({
      where: { flwTxRef: tx_ref, status: 'PENDING' },
      data: { status: 'FAILED', flwTxId: String(flwTxId) },
    })
    return NextResponse.json({ received: true })
  }

  // Verify transaction with Flutterwave (security best practice)
  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${flwTxId}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
  })
  const verifyData = await verifyRes.json()
  if (verifyData.data?.status !== 'successful') {
    return NextResponse.json({ received: true })
  }

  // Find payment record
  const payment = await prisma.payment.findUnique({
    where: { flwTxRef: tx_ref },
    include: {
      investor: { select: { fullName: true, email: true } },
      referralMember: { include: { referralPool: true } },
    },
  })

  if (!payment || payment.status === 'SUCCESS') {
    return NextResponse.json({ received: true }) // Already processed
  }

  // ── PROCESS PAYMENT ────────────────────────────────────────
  await prisma.$transaction(async (tx) => {

    // 1. Mark payment as successful
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', flwTxId: String(flwTxId) },
    })

    if (payment.referralMemberId && payment.referralMember) {
      // ── REFERRAL POOL PAYMENT ──
      const member = payment.referralMember
      const pool = member.referralPool

      // Mark member as PAID
      await tx.referralMember.update({
        where: { id: member.id },
        data: { status: 'PAID', paidAt: new Date() },
      })

      // Update pool current amount
      const newAmount = Number(pool.currentAmount) + Number(member.contribution)
      const poolFull = newAmount >= Number(pool.targetAmount)

      await tx.referralPool.update({
        where: { id: pool.id },
        data: {
          currentAmount: newAmount,
          status: poolFull ? 'FULL' : 'OPEN',
        },
      })

      // If pool is now FULL — notify admin via email
      if (poolFull) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@club10pool.com',
          subject: `🎯 Referral Pool Full — ${CATEGORY_LABELS[pool.category]} (${pool.referralCode})`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
              <h2>Referral Pool Ready for Activation</h2>
              <p>A referral pool has reached its target and is ready to be activated.</p>
              <ul>
                <li><strong>Pool Code:</strong> ${pool.referralCode}</li>
                <li><strong>Category:</strong> ${CATEGORY_LABELS[pool.category]}</li>
                <li><strong>Total Amount:</strong> $${Number(pool.targetAmount).toLocaleString()}</li>
              </ul>
              <p>Please log in to the admin panel to activate this pool and input trading account details.</p>
            </div>
          `,
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

        // Update batch current amount
        const batch = await tx.batch.findUnique({ where: { id: payment.batchId! } })
        if (batch) {
          const newBatchAmount = Number((batch as any).currentAmount || 0) + Number(batchMember.capitalAmount)
          const batchFull = newBatchAmount >= Number((batch as any).targetAmount || (batch as any).targetCapital)

          await tx.batch.update({
            where: { id: payment.batchId! },
            data: {
              currentAmount: newBatchAmount,
              ...(batchFull ? { status: 'FULL' } : {}),
            } as any,
          })

          // Notify admin if batch full
          if (batchFull) {
            await sendEmail({
              to: process.env.ADMIN_EMAIL || 'admin@club10pool.com',
              subject: `🎯 Batch Full — ${batch.name} (${batch.batchCode})`,
              html: `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                  <h2>Batch Ready for Activation</h2>
                  <p>Batch <strong>${batch.name}</strong> has reached its target amount and is ready to be activated.</p>
                  <p>Please log in to the admin panel to activate and input the MT4/MT5 trading account details.</p>
                </div>
              `,
            })
          }
        }
      }
    }

    // Create transaction record
    await tx.transaction.create({
      data: {
        investorId: payment.investorId,
        batchId: payment.batchId,
        type: 'DEPOSIT',
        amount: payment.amountUSD,
        status: 'CONFIRMED',
        description: `Payment via Flutterwave (₦${Number(payment.amountNGN).toLocaleString()})`,
      } as any,
    })
  })

  // Send confirmation email to investor
  await sendEmail({
    to: payment.investor.email,
    subject: 'Payment Confirmed — Club10 Pool',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#00d4aa,#0099aa);padding:24px 28px;">
          <h2 style="margin:0;color:#000;">✓ Payment Confirmed</h2>
        </div>
        <div style="padding:28px;">
          <p>Hi <strong>${payment.investor.fullName}</strong>,</p>
          <p>Your payment of <strong style="color:#c9a84c;">$${Number(payment.amountUSD).toLocaleString()}</strong> 
             (₦${Number(payment.amountNGN).toLocaleString()}) has been confirmed.</p>
          <p>You are now an active member of your investment pool. 
             Log in to your dashboard to view your pool status and trading details.</p>
          <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ received: true })
}

// Fix reference to secret variable name
const FLW_WEBHOOK_SECRET = FLW_SECRET_HASH
