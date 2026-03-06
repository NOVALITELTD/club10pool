import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const { fullName, phone, bankName, bankAccount } = await req.json()
    await prisma.investor.update({
      where: { id: auth.memberId },
      data: { fullName, phone, bankName, bankAccount },
    })
    return ok({ message: 'Profile updated' })
  } catch (e) {
    return error('Server error', 500)
  }
}