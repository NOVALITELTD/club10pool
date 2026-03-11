// src/app/api/payments/initiate/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { nanoid } from 'nanoid'
import { PaymentStatus } from '@prisma/client'

const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NP_BASE    = 'https://api.nowpayments.io/v1'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getUSDtoNGNRate(): Promise<number> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const d = await res.json()
    return d.rates?.NGN || 1600
  } catch { return 1600 }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const body = await req.json()
  const { type, batchId, referralMemberId } = body as {
    type: 'batch' | 'referral'
    batchId?: string
    referralMemberId?: string
  }

  const investor = await prisma.investor.findUnique({ where: { id: auth.memberId } })
  if (!investor) return error('Investor not found')

  const kyc = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${auth.memberId} LIMIT 1
  `
  if (!kyc.length || kyc[0].status !== 'APPROVED') return error('KYC must be approved')

  let amountUSD = 0
  let description = ''

  if (type === 'batch' && batchId) {
    const { capitalAmount: bodyAmount } = body as any
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { name: true, batchCode: true, minContribution: true, maxContribution: true, contributionPerMember: true, targetAmount: true, targetCapital: true, currentAmount: true },
    })
    if (!batch) return error('Batch not found')
    const min = Number(batch.minContribution || batch.contributionPerMember || 10)
    const max = Number(batch.maxContribution || batch.contributionPerMember || 50)
    const raw = bodyAmount ? Number(bodyAmount) : min
    amountUSD = Math.ceil(raw / 10) * 10
    if (amountUSD < min || amountUSD > max) return error(`Contribution must be $${min}–$${max}`)
    const target = Number(batch.targetAmount || batch.targetCapital || 0)
    const current = Number(batch.currentAmount || 0)
    if (target > 0 && current + amountUSD > target) return error(`Max available: $${target - current}`)
    description = `Club10 Pool — ${batch.name} (${batch.batchCode})`

  } else if (type === 'referral' && referralMemberId) {
    const member = await prisma.referralMember.findUnique({
      where: { id: referralMemberId, investorId: auth.memberId },
      include: { referralPool: { select: { referralCode: true, status: true } } },
    })
    if (!member) return error('Referral membership not found')
    if (member.status !== 'PENDING_PAYMENT') return error('Payment already completed or not required')
    if (member.referralPool.status !== 'OPEN') return error('This referral pool is no longer accepting payments')
    amountUSD = Number(member.contribution)
    description = `Club10 Pool — Referral Pool (${member.referralPool.referralCode})`

  } else {
    return error('Invalid payment type or missing ID')
  }

  if (amountUSD <= 0) return error('Invalid payment amount')

  const GATEWAY_FEE = 1
  const chargeAmount = amountUSD + GATEWAY_FEE

  const rate = await getUSDtoNGNRate()
  const amountNGN = Math.ceil(chargeAmount * rate)
  const txRef = `C10-${nanoid(12).toUpperCase()}`

  const npRes = await fetch(`${NP_BASE}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NP_API_KEY,
    },
    body: JSON.stringify({
      price_amount: chargeAmount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: txRef,
      order_description: description,
      ipn_callback_url: `${APP_URL}/api/payments/webhook`,
      success_url: `${APP_URL}/payment/verify?tx_ref=${txRef}`,
      cancel_url: `${APP_URL}/dashboard`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false,
    }),
  })

  const npData = await npRes.json()

  if (!npData.invoice_url) {
    console.error('NowPayments error:', npData)
    return error(`Payment gateway error: ${npData.message || 'Failed to create invoice'}`)
  }

  const payment = await prisma.payment.create({
    data: {
      investorId: auth.memberId,
      batchId: type === 'batch' ? batchId : null,
      referralMemberId: type === 'referral' ? referralMemberId : null,
      amountUSD,
      amountNGN,
      exchangeRate: rate,
      flwTxRef: txRef,
      flwTxId: npData.id ? String(npData.id) : null,
      status: PaymentStatus.PENDING,
    },
  })

  return ok({
    paymentId: payment.id,
    txRef,
    paymentLink: npData.invoice_url,
    amountUSD,
    amountNGN,
    exchangeRate: rate,
  })
}
