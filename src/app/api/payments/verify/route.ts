// src/app/api/payments/verify/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized, notFound } from '@/lib/api'

const CATEGORY_LABELS: Record<string, string> = {
  CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
  STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const txRef = new URL(req.url).searchParams.get('tx_ref')
  if (!txRef) return error('tx_ref is required')

  const payment = await prisma.payment.findUnique({
    where: { flwTxRef: txRef },
    include: {
      referralMember: {
        include: { referralPool: { select: { id: true, category: true, status: true, referralCode: true } } },
      },
      // Also include batch for direct batch payments
      batch: { select: { id: true, category: true, status: true, name: true, batchCode: true } },
    },
  })

  if (!payment) return notFound('Payment not found')
  if (payment.investorId !== auth.memberId) return error('Unauthorized', 403)

  // Determine pool category — referral pool takes priority, then direct batch
  const referralPool = payment.referralMember?.referralPool
  const batch = payment.batch

  const poolCategory = referralPool
    ? CATEGORY_LABELS[referralPool.category]
    : batch?.category
    ? CATEGORY_LABELS[batch.category]
    : null

  const poolStatus = referralPool?.status || batch?.status || null

  return ok({
    status: payment.status,
    amountUSD: payment.amountUSD,
    amountNGN: payment.amountNGN,
    txRef: payment.flwTxRef,
    type: payment.batchId ? 'batch' : 'referral',
    poolCategory,
    poolStatus,
    poolName: batch?.name || null,
    poolCode: batch?.batchCode || referralPool?.referralCode || null,
    createdAt: payment.createdAt,
  })
}
