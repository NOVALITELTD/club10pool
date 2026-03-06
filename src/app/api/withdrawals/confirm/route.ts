import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const { withdrawalId } = await req.json()
    await prisma.$executeRaw`
      UPDATE withdrawals SET status = 'CONFIRMED', "confirmedAt" = NOW()
      WHERE id = ${withdrawalId} AND "investorId" = ${auth.memberId}
    `
    return ok({ message: 'Payout confirmed' })
  } catch (e) {
    return error('Server error', 500)
  }
}