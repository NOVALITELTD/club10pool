// src/app/api/referrals/[code]/route.ts
// GET /api/referrals/[code] — public lookup of a referral pool by code
// Used on the /[referralCode] landing page

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, notFound } from '@/lib/api'

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const pool = await prisma.referralPool.findUnique({
    where: { referralCode: params.code },
    include: {
      creator: { select: { fullName: true } },
      members: {
        where: { status: { in: ['PAID', 'ACTIVE'] } },
        select: { id: true, contribution: true, joinedAt: true },
      },
    },
  })

  if (!pool) return notFound('Referral link not found or expired')
  if (pool.status === 'CLOSED') return notFound('This referral pool is no longer accepting members')

  const CATEGORY_LABELS: Record<string, string> = {
    CENT: '$100 Pool',
    STANDARD_1K: '$1,000 Pool',
    STANDARD_5K: '$5,000 Pool',
    STANDARD_10K: '$10,000 Pool',
  }
  const CATEGORY_CONFIG: Record<string, { min: number; max: number; target: number }> = {
    CENT:         { target: 100,   min: 10,   max: 50   },
    STANDARD_1K:  { target: 1000,  min: 100,  max: 500  },
    STANDARD_5K:  { target: 5000,  min: 1000, max: 2500 },
    STANDARD_10K: { target: 10000, min: 2500, max: 5000 },
  }

  const config = CATEGORY_CONFIG[pool.category]
  return ok({
    referralCode: pool.referralCode,
    category: pool.category,
    categoryLabel: CATEGORY_LABELS[pool.category],
    creatorName: pool.creator.fullName,
    status: pool.status,
    currentAmount: pool.currentAmount,
    targetAmount: pool.targetAmount,
    minContribution: config.min,
    maxContribution: config.max,
    paidMemberCount: pool.members.length,
  })
}
