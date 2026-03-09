// src/app/api/referrals/admin/route.ts
// GET /api/referrals/admin — admin fetches all referral pools with members

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const pools = await prisma.referralPool.findMany({
    include: {
      creator: { select: { id: true, fullName: true, email: true } },
      members: {
        include: { investor: { select: { fullName: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      rebates: { orderBy: { month: 'desc' } },
      batch: { select: { id: true, batchCode: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(pools)
}
