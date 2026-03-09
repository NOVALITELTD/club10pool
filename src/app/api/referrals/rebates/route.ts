// src/app/api/referrals/rebates/route.ts
// GET  /api/referrals/rebates        — investor sees their own rebates
// POST /api/referrals/rebates        — admin records a monthly rebate for a pool

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'
import { sendEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const rebates = await prisma.referralRebate.findMany({
    where: { creatorId: auth.memberId },
    include: {
      referralPool: { select: { category: true, referralCode: true } },
    },
    orderBy: { month: 'desc' },
  })

  const totalPending = rebates
    .filter(r => r.status === 'PENDING')
    .reduce((sum, r) => sum + Number(r.creatorBonus), 0)
  const totalCredited = rebates
    .filter(r => r.status === 'CREDITED')
    .reduce((sum, r) => sum + Number(r.creatorBonus), 0)

  return ok({ rebates, totalPending, totalCredited })
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const body = await req.json()
  const { referralPoolId, month, totalRebate, adminNotes } = body as {
    referralPoolId: string
    month: string        // ISO date string e.g. "2025-01-01"
    totalRebate: number
    adminNotes?: string
  }

  if (!referralPoolId || !month || !totalRebate) {
    return error('referralPoolId, month, and totalRebate are required')
  }

  const pool = await prisma.referralPool.findUnique({
    where: { id: referralPoolId },
    include: { creator: { select: { fullName: true, email: true } } },
  })
  if (!pool) return error('Referral pool not found')

  const creatorBonus = totalRebate * 0.1 // 10%

  const rebate = await prisma.referralRebate.upsert({
    where: {
      referralPoolId_month: {
        referralPoolId,
        month: new Date(month),
      },
    },
    create: {
      referralPoolId,
      creatorId: pool.creatorId,
      month: new Date(month),
      totalRebate,
      creatorBonus,
      adminNotes,
      status: 'PENDING',
    },
    update: {
      totalRebate,
      creatorBonus,
      adminNotes,
    },
  })

  // Send email notification to creator
  const monthLabel = new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const CATEGORY_LABELS: Record<string, string> = {
    CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
    STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
  }

  await sendEmail({
    to: pool.creator.email,
    subject: `Your Referral Pool Rebate for ${monthLabel} — Club10 Pool`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0d1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg,#c9a84c,#a07830); padding: 28px 32px;">
          <h1 style="margin:0; font-size:22px; color:#000;">Monthly Rebate Credited 🎉</h1>
        </div>
        <div style="padding: 28px 32px;">
          <p>Hi <strong>${pool.creator.fullName}</strong>,</p>
          <p>Great news! Your referral pool rebate for <strong>${monthLabel}</strong> has been recorded.</p>
          <div style="background:#080a0f; border-radius:10px; padding:20px; margin:20px 0;">
            <div style="margin-bottom:10px;">
              <span style="color:#64748b; font-size:12px;">Pool Category</span><br>
              <strong>${CATEGORY_LABELS[pool.category]}</strong>
            </div>
            <div style="margin-bottom:10px;">
              <span style="color:#64748b; font-size:12px;">Total Pool Rebate</span><br>
              <strong style="color:#00d4aa;">$${totalRebate.toLocaleString()}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:12px;">Your 10% Creator Bonus</span><br>
              <strong style="color:#c9a84c; font-size:22px;">$${creatorBonus.toLocaleString()}</strong>
            </div>
          </div>
          ${adminNotes ? `<p style="color:#94a3b8; font-size:13px;">Admin Note: ${adminNotes}</p>` : ''}
          <p style="color:#64748b; font-size:13px;">
            Your bonus is currently <strong style="color:#f59e0b;">PENDING</strong> and will be credited to your account shortly. 
            You can view your full rebate history in your dashboard under the Referral section.
          </p>
          <p style="color:#475569; font-size:12px; margin-top:24px;">Nova-Lite Club10 Pool Team</p>
        </div>
      </div>
    `,
  })

  return ok({ rebate, creatorBonus, message: `Rebate recorded. Creator bonus: $${creatorBonus}` })
}
