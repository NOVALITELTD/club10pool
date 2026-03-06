// src/app/api/members/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'

// GET /api/members/:id — fetches an investor profile
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth) && auth.memberId !== params.id) return forbidden()

  const investor = await prisma.investor.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      bankName: true,
      bankAccount: true,
      createdAt: true,
      memberships: {
        include: {
          batch: {
            select: { id: true, name: true, status: true, contributionPerMember: true },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })
  if (!investor) return notFound('Investor')
  return ok(investor)
}

// PATCH /api/members/:id — updates an investor profile
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const { fullName, phone, bankName, bankAccount } = body

    const investor = await prisma.investor.update({
      where: { id: params.id },
      data: {
        fullName: fullName ?? undefined,
        phone: phone ?? undefined,
        bankName: bankName ?? undefined,
        bankAccount: bankAccount ?? undefined,
      },
      select: {
        id: true, fullName: true, email: true, phone: true, bankName: true, bankAccount: true,
      },
    })
    return ok(investor)
  } catch (e: any) {
    if (e.code === 'P2025') return notFound('Investor')
    return error('Server error', 500)
  }
}
