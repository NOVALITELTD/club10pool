// src/app/api/batches/force-close/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { batchId, capitalLeft } = await req.json()
    if (!batchId) return error('batchId is required')
    const capital = parseFloat(capitalLeft)
    if (isNaN(capital) || capital < 0) return error('capitalLeft must be a non-negative number')

    const batch = await prisma.$queryRaw<any[]>`
      SELECT id, "batchCode", status FROM batches WHERE id = ${batchId} LIMIT 1
    `
    if (!batch.length) return error('Batch not found', 404)
    const b = batch[0]
    if (!['ACTIVE', 'DISTRIBUTING'].includes(b.status)) {
      return error('Only ACTIVE or DISTRIBUTING batches can be force-closed')
    }

    // Check no active withdrawal window already open
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM withdrawal_requests
      WHERE "batchId" = ${batchId} AND active = true LIMIT 1
    `
    if (existing.length) return error('A withdrawal window is already open for this batch. Close it first or wait for investors to confirm.')

    // Get all active members
    const members = await prisma.$queryRaw<any[]>`
      SELECT id, "investorId", "capitalAmount"
      FROM batch_members
      WHERE "batchId" = ${batchId}
        AND status IN ('ACTIVE', 'WITHDRAWAL_REQUESTED')
    `
    if (!members.length) return error('No active members in this batch')

    const totalCapital = members.reduce((sum: number, m: any) => sum + parseFloat(m.capitalAmount), 0)

    // Each member gets their proportional share of the remaining capital
    // plus zero profit (admin enters 0 profit for forced close with capital return)
    // profit is 0 in a force-close — capital distribution is the payout
    for (const member of members) {
      const sharePercent = totalCapital > 0 ? parseFloat(member.capitalAmount) / totalCapital : 0
      // Their share of remaining capital (this IS their payout — profit is 0)
      const capitalShare = sharePercent * capital
      // profit amount for withdrawal_requests row = 0 (or their capital share if treating as full payout)
      // We set amount = capitalShare so the withdrawal amount shows correctly
      await prisma.$executeRaw`
        INSERT INTO withdrawal_requests (
          "batchId", "investorId", "batchMemberId",
          amount, "sharePercent", status, active,
          "batchCode", "createdAt"
        )
        VALUES (
          ${batchId}, ${member.investorId}, ${member.id},
          ${capitalShare}, ${sharePercent * 100}, 'PENDING', TRUE,
          ${b.batchCode}, NOW()
        )
        ON CONFLICT DO NOTHING
      `
    }

    // Set batch to DISTRIBUTING (withdrawal window open) — will become CLOSED after all confirm
    await prisma.$executeRaw`
      UPDATE batches
      SET status = 'DISTRIBUTING', "currentAmount" = ${capital}, "updatedAt" = NOW()
      WHERE id = ${batchId}
    `

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId,
        actorEmail: auth.email,
        action: 'BATCH_FORCE_CLOSED',
        entityType: 'Batch',
        metadata: { batchId, batchCode: b.batchCode, capitalLeft: capital, membersNotified: members.length },
      },
    })

    return ok({
      message: `Batch force-closed. Withdrawal window opened for ${members.length} investors.`,
      batchCode: b.batchCode,
      membersNotified: members.length,
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}