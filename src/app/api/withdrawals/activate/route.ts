// src/app/api/withdrawals/activate/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { batchCode, profitAmount } = await req.json()
    if (!batchCode || !profitAmount) return error('Batch code and profit amount required')

    const batch = await prisma.batch.findUnique({ where: { batchCode } })
    if (!batch) return error('Batch not found', 404)

    // Check if withdrawal window already open for this batch
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM withdrawal_requests
      WHERE "batchId" = ${batch.id} AND active = true
      LIMIT 1
    `
    if (existing.length) return error('A withdrawal window is already open for this batch')

    const members = await prisma.batchMember.findMany({
      where: { batchId: batch.id, status: 'ACTIVE' },
      include: { investor: true },
    })

    if (!members.length) return error('No active members found in this batch')

    const totalCapital = members.reduce((sum, m) => sum + parseFloat(m.capitalAmount.toString()), 0)

    // Insert one withdrawal_request row per member into the correct table
    for (const member of members) {
      const sharePercent = totalCapital > 0 ? parseFloat(member.capitalAmount.toString()) / totalCapital : 0
      const amount = sharePercent * parseFloat(profitAmount)

      await prisma.$executeRaw`
        INSERT INTO withdrawal_requests (
          "batchId", "investorId", "batchMemberId",
          amount, "sharePercent", status, active,
          "batchCode", "createdAt"
        )
        VALUES (
          ${batch.id}, ${member.investorId}, ${member.id},
          ${amount}, ${sharePercent * 100}, 'PENDING', TRUE,
          ${batchCode}, NOW()
        )
        ON CONFLICT DO NOTHING
      `
    }

    // Move batch to DISTRIBUTING so it disappears from the "Open Window" dropdown
    await prisma.$executeRaw`
      UPDATE batches SET status = 'DISTRIBUTING', "updatedAt" = NOW()
      WHERE id = ${batch.id}
    `

    return ok({ message: `Withdrawal activated for ${members.length} investors` })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
