import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const payouts = await prisma.$queryRaw<any[]>`
    SELECT w.*, i."fullName" as "investorName", i."bankName", i."bankAccount"
    FROM withdrawals w
    JOIN investors i ON w."investorId" = i.id
    ORDER BY w."createdAt" DESC
  `
  return ok(payouts)
}