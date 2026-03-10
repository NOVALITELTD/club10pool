// src/app/api/referrals/join/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

const CATEGORY_MIN: Record<string, number> = {
  CENT: 10, STANDARD_1K: 100, STANDARD_5K: 1000, STANDARD_10K: 2500,
}
const CATEGORY_MAX: Record<string, number> = {
  CENT: 50, STANDARD_1K: 500, STANDARD_5K: 2500, STANDARD_10K: 5000,
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const { referralCode, contributionUSD } = await req.json()
  if (!referralCode) return error('Referral code required')

  // Find pool
  const pool = await prisma.referralPool.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
  })
  if (!pool) return error('Invalid referral code')
  if (pool.status !== 'OPEN') return error('This referral pool is no longer accepting members')
  if (pool.creatorId === auth.memberId) return error('You cannot join your own referral pool')

  // Check KYC
  const kyc = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${auth.memberId}
    ORDER BY "submittedAt" DESC LIMIT 1
  `
  if (!kyc.length || kyc[0].status !== 'APPROVED') {
    return error('KYC must be approved before joining a pool')
  }

  // Check not already in a referral pool of same category
  const existingReferral = await prisma.referralMember.findFirst({
    where: {
      investorId: auth.memberId,
      referralPool: { category: pool.category },
      status: { in: ['PENDING_PAYMENT', 'PAID', 'ACTIVE'] },
    },
  })
  if (existingReferral) return error(`You are already in a ${pool.category} referral pool`)

  // Check not already in an admin batch of same category
  const existingBatch = await prisma.batchMember.findFirst({
    where: {
      investorId: auth.memberId,
      batch: { category: pool.category },
      status: 'ACTIVE',
    },
  })
  if (existingBatch) return error(`You already have an active position in a ${pool.category} batch`)

  // Check not already in this specific pool
  const alreadyMember = await prisma.referralMember.findUnique({
    where: { referralPoolId_investorId: { referralPoolId: pool.id, investorId: auth.memberId } },
  })
  if (alreadyMember) {
    // Return existing member id so payment can proceed
    return ok({ memberId: alreadyMember.id, existing: true })
  }

  // Validate contribution amount
  const min = CATEGORY_MIN[pool.category] ?? 10
  const max = CATEGORY_MAX[pool.category] ?? 50
  const contribution = contributionUSD
    ? Math.ceil(parseFloat(contributionUSD) / 10) * 10  // round up to nearest $10
    : min
  if (contribution < min || contribution > max) {
    return error(`Contribution must be $${min}–$${max} for this pool`)
  }

  const member = await prisma.referralMember.create({
    data: {
      referralPoolId: pool.id,
      investorId: auth.memberId,
      contribution,
      status: 'PENDING_PAYMENT',
    },
  })

  return ok({ memberId: member.id, poolId: pool.id, category: pool.category })
}
