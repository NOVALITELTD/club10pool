// src/app/api/referrals/info/[code]/route.ts
// Public endpoint — no auth needed — returns pool info for landing page
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  const pool = await prisma.referralPool.findUnique({
    where: { referralCode: params.code.toUpperCase() },
    include: { creator: { select: { fullName: true } } },
  })
  if (!pool) return error('Pool not found', 404)
  if (pool.status !== 'OPEN') return error('This pool is no longer accepting members', 410)

  return ok({
    referralCode: pool.referralCode,
    category: pool.category,
    currentAmount: pool.currentAmount,
    targetAmount: pool.targetAmount,
    status: pool.status,
    creatorName: pool.creator.fullName,
  })
}