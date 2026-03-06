import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const transactions = await prisma.transaction.findMany({
    where: { investorId: auth.memberId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok(transactions)
}