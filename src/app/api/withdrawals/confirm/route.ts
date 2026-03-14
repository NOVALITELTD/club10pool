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
  const { code, withdrawalType } = body

  // ── Validate withdrawal type STRICTLY ──
  if (!withdrawalType || !['PROFIT_ONLY', 'PROFIT_AND_CAPITAL'].includes(withdrawalType)) {
    return error('withdrawalType must be PROFIT_ONLY or PROFIT_AND_CAPITAL')
  }
  const wdType: 'PROFIT_ONLY' | 'PROFIT_AND_CAPITAL' = withdrawalType

  // ── Email OTP ──
  if (!code || code.length !== 6) {
    return error('A 6-digit security code is required to confirm withdrawal')
  }
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

  // ── Investor ──
  const investor = await prisma.$queryRaw<any[]>`
    SELECT i.id, i."fullName", i.email, i."walletAddress",
           (SELECT status FROM kyc_submissions
            WHERE "investorId" = i.id
            ORDER BY "submittedAt" DESC LIMIT 1) AS "kycStatus"
    FROM investors i WHERE i.id = ${auth.memberId} LIMIT 1
  `
  if (!investor.length) return error('Investor not found')
  const inv = investor[0]
  if (inv.kycStatus !== 'APPROVED') return error('KYC must be approved before withdrawal')
  if (!inv.walletAddress) return error('No wallet address set. Please update in Settings.')

  // ── Active withdrawal window ──
  const withdrawal = await prisma.$queryRaw<any[]>`
    SELECT wr.id, wr."batchCode", wr.amount, wr."batchId"
    FROM withdrawal_requests wr
    JOIN batch_members bm ON bm."batchId" = wr."batchId"
      AND bm."investorId" = ${auth.memberId}
    WHERE wr."investorId" = ${auth.memberId}
      AND wr.active = true
    ORDER BY wr."createdAt" DESC LIMIT 1
  `
  if (!withdrawal.length) return error('No active withdrawal window found for your batch')

  const { batchCode, batchId, amount: profitAmount } = withdrawal[0]

  // ── Check not already submitted ──
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM payout_requests
    WHERE "investorId" = ${auth.memberId} AND "batchCode" = ${batchCode}
    LIMIT 1
  `
  if (existing.length) return error('You have already submitted a withdrawal request for this batch')

  // ── Get investor capital from batch_members ──
  const memberRow = await prisma.$queryRaw<any[]>`
    SELECT id, "capitalAmount" FROM batch_members
    WHERE "investorId" = ${auth.memberId} AND "batchId" = ${batchId}
    LIMIT 1
  `
  const capitalAmount = memberRow[0] ? parseFloat(memberRow[0].capitalAmount) : 0
  const batchMemberId = memberRow[0]?.id || null

  // ── Calculate total payout ──
  const profit = parseFloat(profitAmount)
  const totalPayout = wdType === 'PROFIT_AND_CAPITAL'
    ? profit + capitalAmount
    : profit

  // ── Insert payout request ──
  await prisma.$executeRaw`
    INSERT INTO payout_requests (
      "investorId", "batchCode", amount, "walletAddress", status,
      "withdrawalType", "capitalAmount", "profitAmount", "createdAt", "updatedAt"
    )
    VALUES (
      ${auth.memberId}, ${batchCode}, ${totalPayout}, ${inv.walletAddress}, 'CONFIRMED',
      ${wdType}, ${capitalAmount}, ${profit}, NOW(), NOW()
    )
  `

  // ── Update batch_member status ──
  if (batchMemberId) {
    if (wdType === 'PROFIT_AND_CAPITAL') {
      await prisma.$executeRaw`
        UPDATE batch_members SET status = 'WITHDRAWN', "withdrawalRequestedAt" = NOW()
        WHERE id = ${batchMemberId}
      `
    }
    // PROFIT_ONLY → member stays ACTIVE, capital stays in pool
  }

  // ── Check if batch should reopen ──
  if (batchId) await checkAndReopenBatch(batchId)

  // ── Notify admin email ──
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `💸 Withdrawal Confirmed — ${batchCode} (${wdType === 'PROFIT_ONLY' ? 'Profit Only' : 'Profit + Capital'})`,
      html: `
        <div style="font-family:sans-serif;background:#080a0f;color:#e2e8f0;padding:28px;border-radius:12px;max-width:480px;">
          <div style="font-size:11px;color:#00d4aa;letter-spacing:3px;margin-bottom:8px;">CLUB10 POOL — WITHDRAWAL</div>
          <h2 style="margin:0 0 16px;">Withdrawal Confirmed</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="color:#64748b;padding:6px 0;">Investor</td><td style="color:#e2e8f0;font-weight:600;">${inv.fullName}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Email</td><td style="color:#e2e8f0;">${inv.email}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Batch</td><td style="color:#c9a84c;font-weight:700;">${batchCode}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Type</td><td style="color:${wdType === 'PROFIT_ONLY' ? '#818cf8' : '#ef4444'};font-weight:700;">${wdType === 'PROFIT_ONLY' ? '📊 Profit Only' : '🚪 Full Exit'}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Profit</td><td style="color:#c9a84c;">$${profit.toLocaleString()}</td></tr>
            ${wdType === 'PROFIT_AND_CAPITAL' ? `<tr><td style="color:#64748b;padding:6px 0;">Capital</td><td style="color:#c9a84c;">$${capitalAmount.toLocaleString()}</td></tr>` : ''}
            <tr><td style="color:#64748b;padding:6px 0;font-weight:700;">Total</td><td style="color:#00d4aa;font-weight:800;">$${totalPayout.toLocaleString()}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Wallet (SOL)</td><td style="color:#00d4aa;font-family:monospace;font-size:11px;word-break:break-all;">${inv.walletAddress}</td></tr>
          </table>
        </div>
      `,
    })
  }

  notifyAdminWithdrawal(inv.fullName || 'Investor', totalPayout, inv.walletAddress || 'N/A').catch(() => {})

  return ok({
    message: wdType === 'PROFIT_ONLY'
      ? 'Profit withdrawal confirmed. Your capital remains active in the pool.'
      : 'Full withdrawal confirmed. You have exited the pool.',
    withdrawalType: wdType,
    totalPayout,
  })
}

async function checkAndReopenBatch(batchId: string) {
  try {
    const batch = await prisma.$queryRaw<any[]>`
      SELECT id, "batchCode", "targetAmount", "targetCapital", status
      FROM batches WHERE id = ${batchId} LIMIT 1
    `
    if (!batch.length || !['ACTIVE', 'DISTRIBUTING'].includes(batch[0].status)) return

    const pendingWithdrawal = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS cnt FROM batch_members
      WHERE "batchId" = ${batchId} AND status = 'WITHDRAWAL_REQUESTED'
    `
    if (Number(pendingWithdrawal[0]?.cnt || 0) > 0) return

    const remaining = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM("capitalAmount"), 0) AS total
      FROM batch_members
      WHERE "batchId" = ${batchId} AND status = 'ACTIVE'
    `
    const remainingCapital = parseFloat(remaining[0]?.total || '0')
    const target = parseFloat(batch[0].targetAmount || batch[0].targetCapital || 0)

    if (remainingCapital < target) {
      await prisma.$executeRaw`
        UPDATE batches SET status = 'FORMING', "currentAmount" = ${remainingCapital}, "updatedAt" = NOW()
        WHERE id = ${batchId}
      `
    }
  } catch (e) {
    console.error('checkAndReopenBatch error:', e)
  }
}
