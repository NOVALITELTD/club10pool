// src/app/api/investors/me/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  const investor = await prisma.investor.findUnique({
    where: { id: auth.memberId },
    select: { id: true, fullName: true, email: true, phone: true, bankName: true, bankAccount: true },
  })
  if (!investor) return error('Not found', 404)
  // Also fetch walletAddress via raw query since it may not be in Prisma model yet
  const wallet = await prisma.$queryRaw<{ walletAddress: string | null }[]>`
    SELECT "walletAddress" FROM investors WHERE id = ${auth.memberId} LIMIT 1
  `
  return ok({ ...investor, walletAddress: wallet[0]?.walletAddress || null })
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  try {
    const { fullName, phone, walletAddress } = await req.json()

    // Update standard fields via Prisma
    await prisma.investor.update({
      where: { id: auth.memberId },
      data: { fullName, phone },
    })

    // Update walletAddress via raw query
    if (walletAddress !== undefined) {
      await prisma.$executeRaw`
        UPDATE investors SET "walletAddress" = ${walletAddress} WHERE id = ${auth.memberId}
      `
    }

    const updated = await prisma.investor.findUnique({
      where: { id: auth.memberId },
      select: { id: true, fullName: true, email: true, phone: true, bankName: true, bankAccount: true },
    })
    const wallet = await prisma.$queryRaw<{ walletAddress: string | null }[]>`
      SELECT "walletAddress" FROM investors WHERE id = ${auth.memberId} LIMIT 1
    `
    return ok({ ...updated, walletAddress: wallet[0]?.walletAddress || null })
  } catch (e) {
    return error('Server error', 500)
  }
}
