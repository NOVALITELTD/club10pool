// src/app/api/withdrawals/confirm/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyAdminWithdrawal } from '@/lib/whatsapp'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const body = await req.json()
  const { withdrawalId, code, withdrawalType } = body

  // Validate withdrawal type
  const wdType: 'PROFIT_ONLY' | 'PROFIT_AND_CAPITAL' = withdrawalType === 'PROFIT_ONLY'
    ? 'PROFIT_ONLY'
    : 'PROFIT_AND_CAPITAL'

  // Always require email OTP code
  if (!code || code.length !== 6) {
    return error('A 6-digit security code is required to confirm withdrawal')
  }

  {
    const codeRecord = await prisma.$queryRaw<any[]>`
      SELECT id FROM security_codes
      WHERE "investorId" = ${auth.memberId}
        AND purpose = 'WITHDRAWAL'
        AND code = ${code}
        AND "expiresAt" > NOW()
        AND "usedAt" IS NULL
      ORDER BY "createdAt" DESC LIMIT 1
    `
    if (!codeRecord.length) return error('Invalid or expired security code. Please request a new one.')
    await prisma.$executeRaw`UPDATE security_codes SET "usedAt" = NOW() WHERE id = ${codeRecord[0].id}`
  }

  // Get investor wallet + KYC
  const investor = await prisma.$queryRaw<any[]>`
    SELECT i.id, i."fullName", i.email, i."walletAddress",
           (SELECT status FROM kyc_submissions
            WHERE "investorId" = i.id
            ORDER BY "submittedAt" DESC LIMIT 1) AS "kycStatus"
    FROM investors i
    WHERE i.id = ${auth.memberId}
    LIMIT 1
  `
  if (!investor.length) return error('Investor not found')
  const inv = investor[0]
  if (inv.kycStatus !== 'APPROVED') return error('KYC must be approved before withdrawal')
  if (!inv.walletAddress) return error('No wallet address set. Please update in Settings.')

  // Get the active withdrawal window for this investor's batch
  const withdrawal = await prisma.$queryRaw<any[]>`
    SELECT wr.id, wr."batchCode", wr.amount, wr."batchId"
    FROM withdrawal_requests wr
    JOIN batch_members bm ON bm."batchId" = wr."batchId"
      AND bm."investorId" = ${auth.memberId}
    WHERE wr.active = true
    ORDER BY wr."createdAt" DESC LIMIT 1
  `

  const batchCode = withdrawal[0]?.batchCode || 'MANUAL'
  const batchId = withdrawal[0]?.batchId || null
  const profitAmount = withdrawal[0]?.amount || 0

  // Check not already submitted
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM payout_requests
    WHERE "investorId" = ${auth.memberId} AND "batchCode" = ${batchCode}
    LIMIT 1
  `
  if (existing.length) return error('You have already submitted a withdrawal request for this batch')

  // Get investor's capital amount from batch_members
  const memberRow = await prisma.$queryRaw<any[]>`
    SELECT id, "capitalAmount" FROM batch_members
    WHERE "investorId" = ${auth.memberId} AND "batchId" = ${batchId}
    LIMIT 1
  `
  const capitalAmount = memberRow[0] ? parseFloat(memberRow[0].capitalAmount) : 0
  const batchMemberId = memberRow[0]?.id || null

  // Total payout = profit only OR profit + capital
  const totalPayout = wdType === 'PROFIT_AND_CAPITAL'
    ? parseFloat(profitAmount) + capitalAmount
    : parseFloat(profitAmount)

  // Insert payout request with withdrawalType
  await prisma.$executeRaw`
    INSERT INTO payout_requests (
      "investorId", "batchCode", amount, "walletAddress", status,
      "withdrawalType", "capitalAmount", "profitAmount", "createdAt", "updatedAt"
    )
    VALUES (
      ${auth.memberId}, ${batchCode}, ${totalPayout}, ${inv.walletAddress}, 'CONFIRMED',
      ${wdType}, ${capitalAmount}, ${parseFloat(profitAmount)}, NOW(), NOW()
    )
  `

  // Update batch_member status based on withdrawal type
  if (batchMemberId) {
    if (wdType === 'PROFIT_AND_CAPITAL') {
      // Fully exit the batch
      await prisma.$executeRaw`
        UPDATE batch_members
        SET status = 'WITHDRAWN', "withdrawalRequestedAt" = NOW()
        WHERE id = ${batchMemberId}
      `
    }
    // PROFIT_ONLY: keep member status as ACTIVE (capital stays in pool)
  }

  // After all members in the batch have submitted, check if batch should reopen
  if (batchId) {
    await checkAndReopenBatch(batchId)
  }

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `💸 New Withdrawal Request — ${batchCode} (${wdType === 'PROFIT_ONLY' ? 'Profit Only' : 'Profit + Capital'})`,
      html: `
        <div style="font-family:sans-serif;background:#080a0f;color:#e2e8f0;padding:28px;border-radius:12px;max-width:480px;">
          <div style="font-size:11px;color:#00d4aa;letter-spacing:3px;margin-bottom:8px;">CLUB10 POOL — WITHDRAWAL</div>
          <h2 style="margin:0 0 16px;">New Withdrawal Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="color:#64748b;padding:6px 0;">Investor</td><td style="color:#e2e8f0;font-weight:600;">${inv.fullName}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Email</td><td style="color:#e2e8f0;">${inv.email}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Batch</td><td style="color:#c9a84c;font-weight:700;">${batchCode}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Type</td><td style="color:${wdType === 'PROFIT_ONLY' ? '#818cf8' : '#ef4444'};font-weight:700;">${wdType === 'PROFIT_ONLY' ? '📊 Profit Only' : '🚪 Profit + Capital (Full Exit)'}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Profit Amount</td><td style="color:#c9a84c;font-weight:700;">$${parseFloat(profitAmount).toLocaleString()}</td></tr>
            ${wdType === 'PROFIT_AND_CAPITAL' ? `<tr><td style="color:#64748b;padding:6px 0;">Capital Amount</td><td style="color:#c9a84c;font-weight:700;">$${capitalAmount.toLocaleString()}</td></tr>` : ''}
            <tr><td style="color:#64748b;padding:6px 0;font-weight:700;">Total to Send</td><td style="color:#00d4aa;font-weight:800;">$${totalPayout.toLocaleString()}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Wallet (SOL)</td><td style="color:#00d4aa;font-family:monospace;font-size:11px;word-break:break-all;">${inv.walletAddress}</td></tr>
          </table>
          <div style="margin-top:20px;padding:12px;background:#0d1117;border-radius:8px;font-size:12px;color:#64748b;">
            Log in to the admin dashboard to view all pending withdrawals and export the CSV for bulk payment.
          </div>
        </div>
      `,
    })
  }

  // WhatsApp notify admin
  notifyAdminWithdrawal(inv.fullName || 'Investor', totalPayout, inv.walletAddress || 'N/A').catch(() => {})

  return ok({
    message: wdType === 'PROFIT_ONLY'
      ? 'Profit withdrawal confirmed. Your capital remains active in the pool.'
      : 'Full withdrawal confirmed. You have exited the pool.',
    withdrawalType: wdType,
    totalPayout,
  })
}

/**
 * After any member confirms withdrawal, check if ALL members have now submitted.
 * If all have submitted AND remaining capital (from PROFIT_ONLY members) is below
 * the pool's target amount, reopen the batch for new investors.
 */
async function checkAndReopenBatch(batchId: string) {
  try {
    // Get batch info
    const batch = await prisma.$queryRaw<any[]>`
      SELECT id, "batchCode", category, "targetAmount", "targetCapital", status
      FROM batches WHERE id = ${batchId} LIMIT 1
    `
    if (!batch.length || batch[0].status !== 'ACTIVE') return

    const b = batch[0]

    // Count total active/withdrawal members
    const memberStats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'WITHDRAWAL_REQUESTED')) AS "pendingCount",
        COUNT(*) FILTER (WHERE status = 'WITHDRAWN') AS "withdrawnCount",
        COALESCE(SUM("capitalAmount") FILTER (WHERE status = 'ACTIVE'), 0) AS "remainingCapital"
      FROM batch_members
      WHERE "batchId" = ${batchId}
    `
    if (!memberStats.length) return

    const { pendingCount, withdrawnCount, remainingCapital } = memberStats[0]
    const pending = Number(pendingCount)
    const withdrawn = Number(withdrawnCount)
    const remaining = parseFloat(remainingCapital)

    // Only act if ALL members who requested withdrawal have been processed
    // i.e. no more WITHDRAWAL_REQUESTED status left
    const pendingWithdrawal = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS cnt FROM batch_members
      WHERE "batchId" = ${batchId} AND status = 'WITHDRAWAL_REQUESTED'
    `
    const stillPending = Number(pendingWithdrawal[0]?.cnt || 0)
    if (stillPending > 0) return // not everyone has submitted yet

    // All done — check if remaining capital fills the pool
    const target = parseFloat(b.targetAmount || b.targetCapital || 0)
    if (remaining < target) {
      // Reopen batch for new investors to fill the gap
      await prisma.$executeRaw`
        UPDATE batches
        SET status = 'FORMING', "currentAmount" = ${remaining}, "updatedAt" = NOW()
        WHERE id = ${batchId}
      `
    }
    // If remaining >= target, batch stays ACTIVE (profit-only members keep it going)
  } catch (e) {
    console.error('checkAndReopenBatch error:', e)
  }
}
