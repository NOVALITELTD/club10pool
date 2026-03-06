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

    const members = await prisma.batchMember.findMany({
      where: { batchId: batch.id, status: 'ACTIVE' },
      include: { investor: true },
    })

    const totalCapital = members.reduce((sum, m) => sum + parseFloat(m.capitalAmount.toString()), 0)

    // Create withdrawal record for each member
    for (const member of members) {
      const sharePercent = totalCapital > 0 ? parseFloat(member.capitalAmount.toString()) / totalCapital : 0
      const amount = sharePercent * parseFloat(profitAmount)

      await prisma.$executeRaw`
        INSERT INTO withdrawals (id, "batchId", "investorId", "batchMemberId", amount, "sharePercent", status, active, "batchCode", "createdAt")
        VALUES (${crypto.randomUUID()}, ${batch.id}, ${member.investorId}, ${member.id}, ${amount}, ${sharePercent * 100}, 'PENDING', TRUE, ${batchCode}, NOW())
        ON CONFLICT DO NOTHING
      `
    }

    return ok({ message: `Withdrawal activated for ${members.length} investors` })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}