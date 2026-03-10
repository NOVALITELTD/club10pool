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
  const { withdrawalId, code } = body

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

  // Get investor wallet + KYC — fix: quote column names, use subquery for latest KYC
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
    SELECT wr.id, wr."batchCode", wr.amount
    FROM withdrawal_requests wr
    JOIN batch_members bm ON bm."batchId" = wr."batchId"
      AND bm."investorId" = ${auth.memberId}
    WHERE wr.active = true
    ORDER BY wr."createdAt" DESC LIMIT 1
  `

  const batchCode = withdrawal[0]?.batchCode || 'MANUAL'
  const amount = withdrawal[0]?.amount || 0

  // Check not already submitted
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM payout_requests
    WHERE "investorId" = ${auth.memberId} AND "batchCode" = ${batchCode}
    LIMIT 1
  `
  if (existing.length) return error('You have already submitted a withdrawal request for this batch')

  // Insert payout request
  await prisma.$executeRaw`
    INSERT INTO payout_requests ("investorId", "batchCode", amount, "walletAddress", status, "createdAt", "updatedAt")
    VALUES (${auth.memberId}, ${batchCode}, ${amount}, ${inv.walletAddress}, 'CONFIRMED', NOW(), NOW())
  `

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `💸 New Withdrawal Request — ${batchCode}`,
      html: `
        <div style="font-family:sans-serif;background:#080a0f;color:#e2e8f0;padding:28px;border-radius:12px;max-width:480px;">
          <div style="font-size:11px;color:#00d4aa;letter-spacing:3px;margin-bottom:8px;">CLUB10 POOL — WITHDRAWAL</div>
          <h2 style="margin:0 0 16px;">New Withdrawal Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="color:#64748b;padding:6px 0;">Investor</td><td style="color:#e2e8f0;font-weight:600;">${inv.fullName}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Email</td><td style="color:#e2e8f0;">${inv.email}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Batch</td><td style="color:#c9a84c;font-weight:700;">${batchCode}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Amount</td><td style="color:#c9a84c;font-weight:700;">$${parseFloat(amount).toLocaleString()}</td></tr>
            <tr><td style="color:#64748b;padding:6px 0;">Wallet (SOL)</td><td style="color:#00d4aa;font-family:monospace;font-size:11px;word-break:break-all;">${inv.walletAddress}</td></tr>
          </table>
          <div style="margin-top:20px;padding:12px;background:#0d1117;border-radius:8px;font-size:12px;color:#64748b;">
            Log in to the admin dashboard to view all pending withdrawals and export the CSV for bulk payment.
          </div>
        </div>
      `,
    })
  }

  // WhatsApp notify admin (fire and forget)
  notifyAdminWithdrawal(inv.fullName || 'Investor', parseFloat(amount), inv.walletAddress || 'N/A').catch(() => {})

  return ok({ message: 'Withdrawal confirmed successfully' })
}
