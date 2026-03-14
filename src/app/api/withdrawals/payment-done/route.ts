// src/app/api/withdrawals/payment-done/route.ts
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

  // Get all confirmed unpaid payouts for this batch
  const payouts = await prisma.$queryRaw<any[]>`
    SELECT
      pr.id, pr."investorId", pr.amount,
      pr."withdrawalType", pr."capitalAmount", pr."profitAmount",
      i."fullName", i.email, i."walletAddress"
    FROM payout_requests pr
    JOIN investors i ON i.id = pr."investorId"
    WHERE pr."batchCode" = ${batchCode}
      AND pr.status = 'CONFIRMED'
      AND (pr."paymentDone" IS NULL OR pr."paymentDone" = false)
  `
  if (!payouts.length) return error('No confirmed unpaid payouts found for this batch')

  // Mark all as paid
  await prisma.$executeRaw`
    UPDATE payout_requests
    SET "paymentDone" = true, "paidAt" = NOW()
    WHERE "batchCode" = ${batchCode} AND status = 'CONFIRMED'
  `

  // Close the withdrawal window for this batch
  await prisma.$executeRaw`
    UPDATE withdrawal_requests
    SET active = false
    WHERE "batchCode" = ${batchCode} AND active = true
  `

  // Notify each investor
  for (const payout of payouts) {
    const isFullExit = payout.withdrawalType === 'PROFIT_AND_CAPITAL'
    const profit = parseFloat(payout.profitAmount || 0)
    const capital = parseFloat(payout.capitalAmount || 0)
    const total = parseFloat(payout.amount || 0)

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
            <p>Your withdrawal has been processed and sent to your Solana wallet.</p>
            <div style="background:#080a0f;border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:14px;margin:16px 0;">
              <table style="width:100%;font-size:13px;border-collapse:collapse;">
                <tr><td style="color:#64748b;padding:4px 0;">Type</td><td style="color:${isFullExit ? '#ef4444' : '#818cf8'};font-weight:700;">${isFullExit ? '🚪 Full Exit' : '📊 Profit Only'}</td></tr>
                <tr><td style="color:#64748b;padding:4px 0;">Profit Share</td><td style="color:#c9a84c;font-weight:700;">$${profit.toLocaleString()}</td></tr>
                ${isFullExit ? `<tr><td style="color:#64748b;padding:4px 0;">Capital Returned</td><td style="color:#c9a84c;">$${capital.toLocaleString()}</td></tr>` : ''}
                <tr><td style="color:#64748b;padding:4px 0;font-weight:700;">Total Sent</td><td style="color:#00d4aa;font-weight:800;font-size:16px;">$${total.toLocaleString()}</td></tr>
              </table>
            </div>
            <div style="background:#080a0f;border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:14px;margin:16px 0;">
              <div style="font-size:11px;color:#64748b;letter-spacing:2px;margin-bottom:6px;">WALLET ADDRESS (SOLANA)</div>
              <div style="font-family:monospace;color:#00d4aa;word-break:break-all;font-size:12px;">${payout.walletAddress || 'N/A'}</div>
            </div>
            ${!isFullExit ? `
            <div style="background:rgba(129,140,248,0.08);border:1px solid rgba(129,140,248,0.2);border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#818cf8;">
              📊 Your capital remains active in the pool — you will continue earning in the next trading cycle.
            </div>` : `
            <div style="background:rgba(0,212,170,0.06);border:1px solid rgba(0,212,170,0.15);border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#64748b;">
              You have fully exited this pool. You are welcome to join a new batch anytime.
            </div>`}
            <p style="color:#94a3b8;font-size:13px;">If you used Spenda, the USDT will be automatically converted to Naira in your local account.</p>
            <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
          </div>
        </div>
      `,
    })
  }

  // ── Determine new batch status based on remaining active capital ──
  const batch = await prisma.$queryRaw<any[]>`
    SELECT id, "batchCode", "targetAmount", "targetCapital"
    FROM batches WHERE "batchCode" = ${batchCode} LIMIT 1
  `

  if (batch.length) {
    const batchId = batch[0].id
    const target = parseFloat(batch[0].targetAmount || batch[0].targetCapital || 0)

    // Sum capital of members who did PROFIT_ONLY (still ACTIVE, capital stayed)
    const remaining = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(bm."capitalAmount"), 0) AS total
      FROM batch_members bm
      WHERE bm."batchId" = ${batchId}
        AND bm.status = 'ACTIVE'
    `
    const remainingCapital = parseFloat(remaining[0]?.total || '0')

    let newStatus: string
    if (remainingCapital <= 0) {
      // Everyone exited — close the batch fully
      newStatus = 'CLOSED'
    } else if (remainingCapital >= target) {
      // Enough capital to keep trading — back to ACTIVE
      newStatus = 'ACTIVE'
    } else {
      // Partial capital remaining — open for new investors to fill the gap
      newStatus = 'FORMING'
    }

    await prisma.$executeRaw`
      UPDATE batches
      SET status = ${newStatus}, "currentAmount" = ${remainingCapital}, "updatedAt" = NOW()
      WHERE id = ${batchId}
    `
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

  return ok({
    message: `Payment marked done. ${payouts.length} investors notified.`,
  })
}
