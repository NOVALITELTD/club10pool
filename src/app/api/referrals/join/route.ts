// src/app/api/referrals/join/route.ts
// POST /api/referrals/join
// Authenticated investor joins a referral pool (before payment)

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

const CATEGORY_CONFIG: Record<string, { min: number; max: number; target: number }> = {
  CENT:         { target: 100,   min: 10,   max: 50   },
  STANDARD_1K:  { target: 1000,  min: 100,  max: 500  },
  STANDARD_5K:  { target: 5000,  min: 1000, max: 2500 },
  STANDARD_10K: { target: 10000, min: 2500, max: 5000 },
}

// Round contribution up to nearest 10
function roundUpToNearest10(amount: number): number {
  return Math.ceil(amount / 10) * 10
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const body = await req.json()
  const { referralCode, contributionUSD } = body as { referralCode: string; contributionUSD: number }

  if (!referralCode) return error('Referral code is required')
  if (!contributionUSD || isNaN(contributionUSD)) return error('Contribution amount is required')

  // Check KYC
  const investor = await prisma.investor.findUnique({ where: { id: auth.memberId } })
  if (!investor) return error('Investor not found')
  if ((investor as any).kycStatus !== 'APPROVED') return error('KYC must be approved before joining a pool')

  // Find pool
  const pool = await prisma.referralPool.findUnique({
    where: { referralCode },
    include: { members: { where: { status: { in: ['PAID', 'ACTIVE'] } } } },
  })
  if (!pool) return error('Referral pool not found')
  if (pool.status !== 'OPEN') return error('This referral pool is no longer accepting members')

  // Creator cannot join their own pool as a member
  if (pool.creatorId === auth.memberId) return error('You cannot join your own referral pool as a member')

  // Check already joined
  const alreadyJoined = await prisma.referralMember.findUnique({
    where: { referralPoolId_investorId: { referralPoolId: pool.id, investorId: auth.memberId } },
  })
  if (alreadyJoined) return error('You have already joined this referral pool')

  const config = CATEGORY_CONFIG[pool.category]
  const rounded = roundUpToNearest10(contributionUSD)

  if (rounded < config.min) return error(`Minimum contribution is $${config.min} for this pool`)
  if (rounded > config.max) return error(`Maximum contribution is $${config.max} for this pool`)

  // Check pool won't overflow
  const newTotal = Number(pool.currentAmount) + rounded
  if (newTotal > Number(pool.targetAmount)) {
    const remaining = Number(pool.targetAmount) - Number(pool.currentAmount)
    return error(`Only $${remaining.toFixed(2)} remaining in this pool. Max you can contribute is $${Math.min(config.max, Math.floor(remaining / 10) * 10)}`)
  }

  // Create referral member record
  const member = await prisma.referralMember.create({
    data: {
      referralPoolId: pool.id,
      investorId: auth.memberId,
      contribution: rounded,
      status: 'PENDING_PAYMENT',
    },
  })

  return ok({
    memberId: member.id,
    referralPoolId: pool.id,
    contributionUSD: rounded,
    message: `You've reserved your slot. Please complete payment to confirm your spot.`,
  })
}
