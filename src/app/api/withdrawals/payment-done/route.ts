// src/app/api/withdrawals/payment-done/route.ts
// Admin marks payment as done → notifies all confirmed investors via email + dashboard flag
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const { batchCode } = await req.json()
  if (!batchCode) return error('batchCode is required')

  // Find all confirmed withdrawal requests for this batch
  const payouts = await prisma.$queryRaw<any[]>`
    SELECT 
      pr.id, pr."investorId", pr.amount,
      i."fullName", i.email, i."walletAddress"
    FROM payout_requests pr
    JOIN investors i ON i.id = pr."investorId"
    WHERE pr."batchCode" = ${batchCode}
      AND pr.status = 'CONFIRMED'
      AND (pr."paymentDone" IS NULL OR pr."paymentDone" = false)
  `

  if (!payouts.length) return error('No confirmed payouts found for this batch')

  // Mark all as payment done
  await prisma.$executeRaw`
    UPDATE payout_requests 
    SET "paymentDone" = true, "paidAt" = NOW()
    WHERE "batchCode" = ${batchCode} AND status = 'CONFIRMED'
  `

  // Notify each investor via email
  for (const payout of payouts) {
    await sendEmail({
      to: payout.email,
      subject: '💸 Your Withdrawal Has Been Processed — Club10 Pool',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#00d4aa,#0099aa);padding:24px 28px;">
            <h2 style="margin:0;color:#000;">💸 Payment Processed</h2>
          </div>
          <div style="padding:28px;">
            <p>Hi <strong>${payout.fullName}</strong>,</p>
            <p>Your withdrawal of <strong style="color:#c9a84c;">$${parseFloat(payout.amount).toLocaleString()}</strong> has been processed and sent to your USDT wallet.</p>
            <div style="background:#080a0f;border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:14px;margin:16px 0;">
              <div style="font-size:11px;color:#64748b;letter-spacing:2px;margin-bottom:6px;">WALLET ADDRESS (USDT TON)</div>
              <div style="font-family:monospace;color:#00d4aa;word-break:break-all;font-size:12px;">${payout.walletAddress || 'N/A'}</div>
            </div>
            <p style="color:#94a3b8;font-size:13px;">Please check your wallet. If you used Spenda, the USDT will be automatically converted to Naira in your local account.</p>
            <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
          </div>
        </div>
      `,
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: auth.memberId,
      actorEmail: auth.email,
      action: 'WITHDRAWAL_PAYMENT_DONE',
      entityType: 'PayoutRequest',
      metadata: { batchCode, count: payouts.length },
    },
  })

  return ok({ message: `Payment marked done. ${payouts.length} investors notified.` })
}