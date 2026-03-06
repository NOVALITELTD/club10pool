// src/app/api/members/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden, notFound } from '@/lib/api'

// GET /api/members/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  // Members can only view their own profile unless admin
  if (!requireAdmin(auth) && auth.memberId !== params.id) return forbidden()

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true, fullName: true, email: true, phone: true,
      isAdmin: true, status: true, createdAt: true,
      batchMembers: {
        include: { batch: { select: { id: true, name: true, status: true, capitalPerMember: true } } },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!member) return notFound('Member')
  return ok(member)
}

// PATCH /api/members/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const body = await req.json()
    const { fullName, phone, status } = body

    const member = await prisma.member.update({
      where: { id: params.id },
      data: {
        fullName: fullName ?? undefined,
        phone: phone ?? undefined,
        status: status ?? undefined,
      },
      select: {
        id: true, fullName: true, email: true, phone: true, isAdmin: true, status: true,
      },
    })

    return ok(member)
  } catch (e: any) {
    if (e.code === 'P2025') return notFound('Member')
    return error('Server error', 500)
  }
}
