// src/app/api/payments/initiate/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { nanoid } from 'nanoid'
import { PaymentStatus } from '@prisma/client'

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'FLWSECK_TEST-XXXX'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getUSDtoNGNRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.flutterwave.com/v3/transfers/rates?amount=1&destination_currency=NGN&source_currency=USD',
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    )
    const data = await res.json()
    if (data?.data?.rate) return data.data.rate
  } catch {}
  return 1600
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

  // Check KYC via kyc_submissions table
  const kyc = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${auth.memberId} LIMIT 1
  `
  if (!kyc.length || kyc[0].status !== 'APPROVED') return error('KYC must be approved')

  let amountUSD = 0
  let description = ''

  if (type === 'batch' && batchId) {
    const batchMember = await prisma.batchMember.findFirst({
      where: { batchId, investorId: auth.memberId },
      include: { batch: { select: { name: true, batchCode: true, category: true } } },
    })
    if (!batchMember) return error('No batch membership found. Join the batch first.')
    amountUSD = Number(batchMember.capitalAmount)
    description = `Club10 Pool — ${batchMember.batch.name} (${batchMember.batch.batchCode})`

  } else if (type === 'referral' && referralMemberId) {
    const member = await prisma.referralMember.findUnique({
      where: { id: referralMemberId, investorId: auth.memberId },
      include: { referralPool: { select: { category: true, referralCode: true, status: true } } },
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

  const rate = await getUSDtoNGNRate()
  const amountNGN = Math.ceil(amountUSD * rate)
  const txRef = `C10-${nanoid(12).toUpperCase()}`

  const payment = await prisma.payment.create({
    data: {
      investorId: auth.memberId,
      batchId: type === 'batch' ? batchId : null,
      referralMemberId: type === 'referral' ? referralMemberId : null,
      amountUSD,
      amountNGN,
      exchangeRate: rate,
      flwTxRef: txRef,
      status: PaymentStatus.PENDING,
    },
  })

  const flwPayload = {
    tx_ref: txRef,
    amount: amountNGN,
    currency: 'NGN',
    redirect_url: `${APP_URL}/payment/verify?tx_ref=${txRef}`,
    meta: {
      paymentId: payment.id,
      investorId: auth.memberId,
      type,
      batchId: batchId || null,
      referralMemberId: referralMemberId || null,
    },
    customer: {
      email: investor.email,
      phonenumber: investor.phone || '',
      name: investor.fullName,
    },
    customizations: {
      title: 'Club10 Pool',
      description,
      logo: `${APP_URL}/logo.png`,
    },
  }

  const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FLW_SECRET_KEY}` },
    body: JSON.stringify(flwPayload),
  })

  const flwData = await flwRes.json()
  if (flwData.status !== 'success' || !flwData.data?.link) {
    return error(`Payment gateway error: ${flwData.message || 'Failed to create payment link'}`)
  }

  return ok({
    paymentId: payment.id,
    txRef,
    paymentLink: flwData.data.link,
    amountUSD,
    amountNGN,
    exchangeRate: rate,
  })
}
