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
  return ok(investor)
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  try {
    const { fullName, phone, bankName, bankAccount } = await req.json()
    const updated = await prisma.investor.update({
      where: { id: auth.memberId },
      data: { fullName, phone, bankName, bankAccount },
      select: { id: true, fullName: true, email: true, phone: true, bankName: true, bankAccount: true },
    })
    return ok(updated)
  } catch (e) {
    return error('Server error', 500)
  }
}
