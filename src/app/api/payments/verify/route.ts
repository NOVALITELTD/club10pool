// src/app/api/payments/verify/route.ts
// GET /api/payments/verify?tx_ref=XXX
// Called after Flutterwave redirect — verifies payment status for the UI

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized, notFound } from '@/lib/api'

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
    },
  })

  if (!payment) return notFound('Payment not found')
  if (payment.investorId !== auth.memberId) return error('Unauthorized', 403)

  const CATEGORY_LABELS: Record<string, string> = {
    CENT: '$100 Pool', STANDARD_1K: '$1,000 Pool',
    STANDARD_5K: '$5,000 Pool', STANDARD_10K: '$10,000 Pool',
  }

  return ok({
    status: payment.status,
    amountUSD: payment.amountUSD,
    amountNGN: payment.amountNGN,
    txRef: payment.flwTxRef,
    type: payment.batchId ? 'batch' : 'referral',
    poolCategory: payment.referralMember?.referralPool
      ? CATEGORY_LABELS[payment.referralMember.referralPool.category]
      : null,
    poolStatus: payment.referralMember?.referralPool?.status || null,
    createdAt: payment.createdAt,
  })
}
