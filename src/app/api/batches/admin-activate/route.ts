// src/app/api/batches/admin-activate/route.ts
// POST /api/batches/admin-activate
// Admin activates a FULL batch or referral pool, inputs MT4/MT5 trading account details

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'
import { sendEmail } from '@/lib/email'
import { TradingPlatform } from '@prisma/client'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const body = await req.json()
  const {
    // Activate a referral pool
    referralPoolId,
    // OR activate an existing direct batch
    batchId,
    // MT4/MT5 Details (required for activation)
    tradingPlatform,  // 'MT4' | 'MT5'
    brokerName,
    tradingAccountId,
    investorPassword,
    tradingServer,
  } = body as {
    referralPoolId?: string
    batchId?: string
    tradingPlatform: TradingPlatform
    brokerName: string
    tradingAccountId: string
    investorPassword: string
    tradingServer: string
  }

  if (!tradingPlatform || !brokerName || !tradingAccountId || !investorPassword || !tradingServer) {
    return error('All trading account details are required: platform, broker, account ID, investor password, server')
  }
  if (!['MT4', 'MT5'].includes(tradingPlatform)) return error('tradingPlatform must be MT4 or MT5')

  // ── ACTIVATE REFERRAL POOL ─────────────────────────────────
  if (referralPoolId) {
    const pool = await prisma.referralPool.findUnique({
      where: { id: referralPoolId },
      include: {
        creator: { select: { fullName: true, email: true } },
        members: {
          where: { status: 'PAID' },
          include: { investor: { select: { fullName: true, email: true } } },
        },
      },
    })
    if (!pool) return error('Referral pool not found')
    if (pool.status !== 'FULL') return error('Pool must be FULL before activation')

    const CATEGORY_LABELS: Record<string, string> = {
      CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
      STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
    }
    const CATEGORY_CODES: Record<string, string> = {
      CENT: 'C', STANDARD_1K: 'S1K', STANDARD_5K: 'S5K', STANDARD_10K: 'S10K',
    }

    const batchCode = `REF-${CATEGORY_CODES[pool.category]}-${pool.referralCode}`

    // Create a real batch for this referral pool
    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          batchCode,
          name: `Referral Pool — ${CATEGORY_LABELS[pool.category]} (${pool.referralCode})`,
          status: 'ACTIVE',
          targetMembers: pool.members.length + 1, // members + creator
          contributionPerMember: pool.members[0]?.contribution || pool.currentAmount,
          targetCapital: pool.targetAmount as any,
          targetAmount: pool.targetAmount as any,
          currentAmount: pool.currentAmount as any,
          category: pool.category as any,
          tradingPlatform,
          brokerName,
          tradingAccountId,
          investorPassword,
          tradingServer,
          referralPoolId: pool.id,
          startDate: new Date(),
        } as any,
      })

      // Enroll creator as batch member
      await tx.batchMember.create({
        data: {
          batchId: newBatch.id,
          investorId: pool.creatorId,
          capitalAmount: 0, // Creator's slot is free (they earn via rebate)
          sharePercent: 0,
          status: 'ACTIVE',
        } as any,
      })

      // Enroll all paid referral members into the batch
      for (const member of pool.members) {
        await tx.batchMember.create({
          data: {
            batchId: newBatch.id,
            investorId: member.investorId,
            capitalAmount: member.contribution as any,
            sharePercent: (Number(member.contribution) / Number(pool.targetAmount)) * 100,
            status: 'ACTIVE',
          } as any,
        })

        // Update referral member status
        await tx.referralMember.update({
          where: { id: member.id },
          data: { status: 'ACTIVE' },
        })
      }

      // Mark pool as ACTIVE
      await tx.referralPool.update({
        where: { id: pool.id },
        data: { status: 'ACTIVE', batchId: newBatch.id },
      })

      return newBatch
    })

    // Notify all members by email
    const allInvestors = [
      pool.creator,
      ...pool.members.map(m => m.investor),
    ]
    const platform = tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'

    for (const investor of allInvestors) {
      await sendEmail({
        to: investor.email,
        subject: `Your Pool is Now LIVE 🚀 — Club10 Pool`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#c9a84c,#a07830);padding:28px 32px;">
              <h1 style="margin:0;color:#000;font-size:22px;">Your Pool is Now LIVE 🚀</h1>
            </div>
            <div style="padding:28px 32px;">
              <p>Hi <strong>${investor.fullName}</strong>,</p>
              <p>Great news! Your referral investment pool has been activated and trading has begun.</p>
              <div style="background:#080a0f;border-radius:10px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 14px;font-weight:700;color:#c9a84c;">📊 Trading Account Details</p>
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                  <tr><td style="color:#64748b;padding:5px 0;">Platform</td><td style="color:#e2e8f0;font-weight:600;">${platform}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Broker</td><td style="color:#e2e8f0;font-weight:600;">${brokerName}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Account ID</td><td style="color:#00d4aa;font-family:monospace;font-weight:700;">${tradingAccountId}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Investor Password</td><td style="color:#00d4aa;font-family:monospace;font-weight:700;">${investorPassword}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Server</td><td style="color:#e2e8f0;font-weight:600;">${tradingServer}</td></tr>
                </table>
              </div>
              <p style="font-size:13px;color:#94a3b8;">
                You can use these details to monitor live trading on your <strong>${platform}</strong> mobile or desktop app. 
                Note: This is an <em>investor (read-only)</em> password — you can view trades but not place them.
              </p>
              <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
            </div>
          </div>
        `,
      })
    }

    return ok({ batch, message: `Referral pool activated. Batch ${batchCode} created with ${pool.members.length} members.` })
  }

  // ── ACTIVATE DIRECT BATCH ──────────────────────────────────
  if (batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return error('Batch not found')
    if (!['FORMING', 'FULL'].includes(batch.status as string)) {
      return error('Batch must be in FORMING or FULL status to activate')
    }

    const updated = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'ACTIVE',
        tradingPlatform,
        brokerName,
        tradingAccountId,
        investorPassword,
        tradingServer,
        startDate: new Date(),
      } as any,
    })

    // Notify all active batch members
    const members = await prisma.batchMember.findMany({
      where: { batchId, status: 'ACTIVE' },
      include: { investor: { select: { fullName: true, email: true } } },
    })

    const platform = tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'
    for (const member of members) {
      await sendEmail({
        to: member.investor.email,
        subject: `Your Batch is Now LIVE 🚀 — ${batch.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#00d4aa,#0099aa);padding:28px 32px;">
              <h1 style="margin:0;color:#000;font-size:22px;">Batch Activated 🚀</h1>
            </div>
            <div style="padding:28px 32px;">
              <p>Hi <strong>${member.investor.fullName}</strong>,</p>
              <p>Your investment batch <strong>${batch.name}</strong> is now ACTIVE and trading has begun.</p>
              <div style="background:#080a0f;border-radius:10px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 14px;font-weight:700;color:#00d4aa;">📊 Trading Account Details</p>
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                  <tr><td style="color:#64748b;padding:5px 0;">Platform</td><td style="color:#e2e8f0;font-weight:600;">${platform}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Broker</td><td style="color:#e2e8f0;font-weight:600;">${brokerName}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Account ID</td><td style="color:#00d4aa;font-family:monospace;font-weight:700;">${tradingAccountId}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Investor Password</td><td style="color:#00d4aa;font-family:monospace;font-weight:700;">${investorPassword}</td></tr>
                  <tr><td style="color:#64748b;padding:5px 0;">Server</td><td style="color:#e2e8f0;font-weight:600;">${tradingServer}</td></tr>
                </table>
              </div>
              <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
            </div>
          </div>
        `,
      })
    }

    return ok({ batch: updated, message: `Batch ${batch.batchCode} activated successfully.` })
  }

  return error('Either referralPoolId or batchId is required')
}
