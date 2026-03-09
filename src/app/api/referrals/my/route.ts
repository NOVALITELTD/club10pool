// src/app/api/referrals/my/route.ts
// GET  /api/referrals/my  — investor's own referral pools + rebates
// POST /api/referrals/my  — create a new referral pool for a category
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { nanoid } from 'nanoid'
import { BatchCategory } from '@prisma/client'

// Category config
const CATEGORY_CONFIG: Record<BatchCategory, { target: number; min: number; max: number; label: string }> = {
  CENT:         { target: 100,   min: 10,   max: 50,   label: '$100 Pool'    },
  STANDARD_1K:  { target: 1000,  min: 100,  max: 500,  label: '$1,000 Pool'  },
  STANDARD_5K:  { target: 5000,  min: 1000, max: 2500, label: '$5,000 Pool'  },
  STANDARD_10K: { target: 10000, min: 2500, max: 5000, label: '$10,000 Pool' },
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const pools = await prisma.referralPool.findMany({
    where: { creatorId: auth.memberId },
    include: {
      members: {
        include: { investor: { select: { fullName: true, email: true } }, payment: true },
        orderBy: { joinedAt: 'asc' },
      },
      rebates: { orderBy: { month: 'desc' } },
      batch: { select: { id: true, name: true, batchCode: true, status: true, tradingPlatform: true, tradingAccountId: true, investorPassword: true, tradingServer: true, brokerName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Also fetch pools where this investor is a referred member (not creator)
  const joinedPools = await prisma.referralMember.findMany({
    where: { investorId: auth.memberId },
    include: {
      referralPool: {
        include: {
          creator: { select: { fullName: true } },
          batch: { select: { id: true, name: true, batchCode: true, status: true, tradingPlatform: true, tradingAccountId: true, investorPassword: true, tradingServer: true, brokerName: true } },
        },
      },
      payment: true,
    },
  })

  return ok({ pools, joinedPools })
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const body = await req.json()
  const { category } = body as { category: BatchCategory }

  if (!category || !CATEGORY_CONFIG[category]) {
    return error('Invalid pool category. Must be CENT, STANDARD_1K, STANDARD_5K, or STANDARD_10K')
  }

  // Check investor exists
  const investor = await prisma.investor.findUnique({ where: { id: auth.memberId } })
  if (!investor) return error('Investor not found')

  // Check KYC via kyc_submissions table (not investor.kycStatus)
  const kyc = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${auth.memberId} LIMIT 1
  `
  if (!kyc.length || kyc[0].status !== 'APPROVED') {
    return error('KYC must be approved before creating a referral pool')
  }

  // Check if investor already has an active/open pool in this category
  const existing = await prisma.referralPool.findFirst({
    where: {
      creatorId: auth.memberId,
      category,
      status: { in: ['OPEN', 'FULL'] },
    },
  })
  if (existing) {
    return error(`You already have an active ${CATEGORY_CONFIG[category].label} referral pool. Complete or close it before creating another.`)
  }

  const config = CATEGORY_CONFIG[category]

  // Generate a unique referral code
  let referralCode = nanoid(8).toUpperCase()
  let attempts = 0
  while (await prisma.referralPool.findUnique({ where: { referralCode } })) {
    referralCode = nanoid(8).toUpperCase()
    if (++attempts > 10) return error('Failed to generate unique referral code. Try again.')
  }

  const pool = await prisma.referralPool.create({
    data: {
      creatorId: auth.memberId,
      category,
      referralCode,
      targetAmount: config.target,
      currentAmount: 0,
      status: 'OPEN',
    },
  })

  return ok({ pool, referralCode, referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${referralCode}` })
}
