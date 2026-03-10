// src/app/api/referrals/join/route.ts
// Existing investor joins a referral pool by code
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

const CATEGORY_MIN: Record<string, number> = {
  CENT: 10, STANDARD_1K: 100, STANDARD_5K: 1000, STANDARD_10K: 2500,
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const { referralCode } = await req.json()
  if (!referralCode) return error('Referral code required')

  // Find pool
  const pool = await prisma.referralPool.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
  })
  if (!pool) return error('Invalid referral code')
  if (pool.status !== 'OPEN') return error('This referral pool is no longer accepting members')

  // Can't join your own pool
  if (pool.creatorId === auth.memberId) return error('You cannot join your own referral pool')

  // Check investor KYC
  const kyc = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${auth.memberId}
    ORDER BY "submittedAt" DESC LIMIT 1
  `
  if (!kyc.length || kyc[0].status !== 'APPROVED') {
    return error('KYC must be approved before joining a pool')
  }

  // Check investor not already in a batch/referral pool of same category
  const existingMembership = await prisma.referralMember.findFirst({
    where: {
      investorId: auth.memberId,
      referralPool: { category: pool.category },
      status: { in: ['PENDING_PAYMENT', 'PAID', 'ACTIVE'] },
    },
  })
  if (existingMembership) {
    return error(`You are already in a ${pool.category} referral pool`)
  }

  // Check not already in an admin batch of same category
  const existingBatchMember = await prisma.batchMember.findFirst({
    where: {
      investorId: auth.memberId,
      batch: { category: pool.category },
      status: 'ACTIVE',
    },
  })
  if (existingBatchMember) {
    return error(`You already have an active position in a ${pool.category} batch`)
  }

  // Check not already in this pool
  const alreadyMember = await prisma.referralMember.findUnique({
    where: { referralPoolId_investorId: { referralPoolId: pool.id, investorId: auth.memberId } },
  })
  if (alreadyMember) return error('You are already a member of this pool')

  const minContribution = CATEGORY_MIN[pool.category] ?? 10

  const member = await prisma.referralMember.create({
    data: {
      referralPoolId: pool.id,
      investorId: auth.memberId,
      contribution: minContribution,
      status: 'PENDING_PAYMENT',
    },
  })

  return ok({ member, pool: { id: pool.id, category: pool.category, referralCode: pool.referralCode } })
}
