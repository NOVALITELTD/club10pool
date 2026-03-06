import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const result = await prisma.$queryRaw<any[]>`
    SELECT w.*, b."batchCode" FROM withdrawals w
    JOIN batches b ON w."batchId" = b.id
    WHERE w."investorId" = ${auth.memberId}
    ORDER BY w."createdAt" DESC LIMIT 1
  `
  return ok(result[0] || null)
}