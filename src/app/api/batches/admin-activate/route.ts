// src/app/api/batches/admin-activate/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const {
      batchId, referralPoolId,
      tradingPlatform, brokerName, tradingAccountId,
      investorPassword, tradingServer,
    } = body

    // ── REFERRAL POOL PATH ──────────────────────────────────────
    if (referralPoolId) {
      const pool = await prisma.referralPool.findUnique({
        where: { id: referralPoolId },
        include: {
          members: {
            where: { status: { in: ['PAID', 'ACTIVE'] } },
            include: { investor: true },
          },
          creator: true,
        },
      })
      if (!pool) return error('Referral pool not found', 404)
      if (pool.status !== 'FULL') return error('Pool must be FULL to activate')

      const cfg: Record<string, any> = {
        CENT:         { target: 100,   min: 10,   max: 50   },
        STANDARD_1K:  { target: 1000,  min: 100,  max: 500  },
        STANDARD_5K:  { target: 5000,  min: 1000, max: 2500 },
        STANDARD_10K: { target: 10000, min: 2500, max: 5000 },
      }
      const c = cfg[pool.category] || { target: 100, min: 10, max: 50 }

      const batch = await prisma.batch.create({
        data: {
          batchCode:             `REF-${pool.referralCode}`,
          name:                  `${pool.category} Referral Pool (${pool.referralCode})`,
          category:              pool.category as any,
          status:                'ACTIVE',
          targetMembers:         pool.members.length,
          contributionPerMember: c.min,
          targetCapital:         c.target,
          targetAmount:          c.target,
          minContribution:       c.min,
          maxContribution:       c.max,
          tradingPlatform,
          brokerName,
          tradingAccountId,
          investorPassword,
          tradingServer,
          referralPoolId:        pool.id,
        },
      })

      await prisma.referralPool.update({
        where: { id: pool.id },
        data: { status: 'ACTIVE', batchId: batch.id },
      })

      const allMembers = [pool.creator, ...pool.members.map((m: any) => m.investor)].filter(Boolean)
      for (const member of allMembers) {
        if (!member?.email) continue
        await sendEmail({
          to: member.email,
          subject: `🚀 Your Referral Pool is Now Live — ${batch.batchCode}`,
          html: buildActivationEmail(member.fullName, batch),
        })
      }

      return ok({ batch, message: `Pool activated. ${allMembers.length} members notified.` })
    }

    // ── DIRECT BATCH PATH ───────────────────────────────────────
    if (!batchId) return error('batchId or referralPoolId is required')

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { investor: true },
        },
      },
    })
    if (!batch) return error('Batch not found', 404)
    if (!['FORMING', 'FULL'].includes(batch.status)) {
      return error('Batch must be FORMING or FULL to activate')
    }

    const alreadyHasCredentials = !!(batch.tradingAccountId && batch.tradingPlatform)

    if (alreadyHasCredentials) {
      // ── REACTIVATION — credentials already saved, just flip status ──
      await prisma.batch.update({
        where: { id: batchId },
        data: { status: 'ACTIVE', updatedAt: new Date() },
      })

      // Notify all currently ACTIVE members
      for (const member of batch.members) {
        if (!member.investor?.email) continue
        await sendEmail({
          to: member.investor.email,
          subject: `🚀 Pool Reactivated — ${batch.batchCode}`,
          html: buildActivationEmail(member.investor.fullName, batch),
        })
      }

      await prisma.auditLog.create({
        data: {
          actorId:    auth.memberId,
          actorEmail: auth.email,
          action:     'BATCH_REACTIVATED',
          entityType: 'Batch',
          metadata:   { batchId, batchCode: batch.batchCode, membersNotified: batch.members.length },
        },
      })

      return ok({
        batch,
        message: `Batch reactivated using saved credentials. ${batch.members.length} members notified.`,
      })
    }

    // ── FIRST ACTIVATION — save credentials permanently ──
    if (!tradingAccountId || !brokerName || !tradingPlatform) {
      return error('Trading platform, broker name and account ID are required')
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status:           'ACTIVE',
        tradingPlatform,
        brokerName,
        tradingAccountId,
        investorPassword,
        tradingServer,
        updatedAt:        new Date(),
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { investor: true },
        },
      },
    })

    for (const member of updatedBatch.members) {
      if (!member.investor?.email) continue
      await sendEmail({
        to: member.investor.email,
        subject: `🚀 Your Batch is Now Live — ${updatedBatch.batchCode}`,
        html: buildActivationEmail(member.investor.fullName, updatedBatch),
      })
    }

    await prisma.auditLog.create({
      data: {
        actorId:    auth.memberId,
        actorEmail: auth.email,
        action:     'BATCH_ACTIVATED',
        entityType: 'Batch',
        metadata:   { batchId, batchCode: updatedBatch.batchCode, membersNotified: updatedBatch.members.length },
      },
    })

    return ok({
      batch: updatedBatch,
      message: `Batch activated. ${updatedBatch.members.length} members notified.`,
    })

  } catch (e: any) {
    console.error(e)
    return error('Server error', 500)
  }
}

function buildActivationEmail(fullName: string, batch: any) {
  return `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0d1117;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00d4aa,#0099aa);padding:24px 28px;">
        <h2 style="margin:0;color:#000;">🚀 Your Pool is Live!</h2>
      </div>
      <div style="padding:28px;">
        <p>Hi <strong>${fullName}</strong>,</p>
        <p>Your investment batch <strong style="color:#c9a84c;">${batch.batchCode}</strong> is now active and trading has begun.</p>
        <div style="background:#080a0f;border:1px solid rgba(0,212,170,0.2);border-radius:8px;padding:16px;margin:16px 0;">
          <div style="font-size:11px;color:#64748b;letter-spacing:2px;margin-bottom:12px;">TRADING ACCESS DETAILS</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="color:#64748b;padding:5px 0;">Platform</td><td style="color:#e2e8f0;font-weight:600;">${batch.tradingPlatform === 'MT4' ? 'MetaTrader 4' : 'MetaTrader 5'}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0;">Broker</td><td style="color:#e2e8f0;">${batch.brokerName || '—'}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0;">Account ID</td><td style="color:#00d4aa;font-family:monospace;">${batch.tradingAccountId || '—'}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0;">Investor Password</td><td style="color:#e2e8f0;font-family:monospace;">${batch.investorPassword || '—'}</td></tr>
            <tr><td style="color:#64748b;padding:5px 0;">Server</td><td style="color:#e2e8f0;">${batch.tradingServer || '—'}</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;font-size:13px;">You can view these details anytime in your Club10 Pool dashboard under <strong>Batches</strong>.</p>
        <p style="color:#475569;font-size:12px;margin-top:24px;">Nova-Lite Club10 Pool Team</p>
      </div>
    </div>
  `
}
