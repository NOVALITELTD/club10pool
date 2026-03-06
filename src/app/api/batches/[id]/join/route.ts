import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  try {
    const batch = await prisma.batch.findUnique({ where: { id: params.id }, include: { _count: { select: { members: true } } } })
    if (!batch) return error('Batch not found', 404)
    if (batch.status !== 'FORMING') return error('Batch is not accepting members')
    if (batch._count.members >= batch.targetMembers) return error('Batch is full')

    const existing = await prisma.batchMember.findFirst({ where: { batchId: params.id, investorId: auth.memberId } })
    if (existing) return error('Already a member of this batch')

    await prisma.batchMember.create({
      data: {
        batchId: params.id,
        investorId: auth.memberId,
        capitalAmount: batch.contributionPerMember,
        sharePercent: 0,
      },
    })

    return ok({ message: 'Successfully joined batch' }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}