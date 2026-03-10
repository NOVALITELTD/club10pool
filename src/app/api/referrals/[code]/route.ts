// src/app/api/referrals/[code]/route.ts
// Public route — no auth needed, used by landing page to look up pool info
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'

const CATEGORY_CONFIG: Record<string, { label: string; min: number; max: number; target: number }> = {
  CENT:         { label: '$100 Pool',    min: 10,   max: 50,   target: 100   },
  STANDARD_1K:  { label: '$1,000 Pool',  min: 100,  max: 500,  target: 1000  },
  STANDARD_5K:  { label: '$5,000 Pool',  min: 1000, max: 2500, target: 5000  },
  STANDARD_10K: { label: '$10,000 Pool', min: 2500, max: 5000, target: 10000 },
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const pool = await prisma.referralPool.findUnique({
      where: { referralCode: params.code.toUpperCase() },
      include: {
        creator: { select: { fullName: true } },
        members: { where: { status: { in: ['PAID', 'ACTIVE'] } }, select: { id: true } },
      },
    })

    if (!pool) return error('Pool not found', 404)

    const cfg = CATEGORY_CONFIG[pool.category] ?? CATEGORY_CONFIG.CENT

    return ok({
      referralCode: pool.referralCode,
      category: pool.category,
      categoryLabel: cfg.label,
      status: pool.status,
      creatorName: pool.creator.fullName,
      currentAmount: pool.currentAmount,
      targetAmount: pool.targetAmount ?? cfg.target,
      minContribution: cfg.min,
      maxContribution: cfg.max,
      paidMemberCount: pool.members.length,
    })
  } catch (e) {
    return error('Failed to fetch referral pool', 500)
  }
}
