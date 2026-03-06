import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const submissions = await prisma.$queryRaw<any[]>`
    SELECT k.*, i."fullName", i.email 
    FROM kyc_submissions k
    JOIN investors i ON k."investorId" = i.id
    ORDER BY k."submittedAt" DESC
  `
  return ok(submissions)
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { investorId, action, adminNotes } = await req.json()
    if (!['approve', 'reject'].includes(action)) return error('action must be approve or reject')

    const kycStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    await prisma.$executeRaw`
      UPDATE kyc_submissions 
      SET status = ${kycStatus}, "adminNotes" = ${adminNotes || null}, "reviewedAt" = NOW(), "reviewedBy" = ${auth.email}
      WHERE "investorId" = ${investorId}
    `
    await prisma.$executeRaw`
      UPDATE investors SET "kycStatus" = ${kycStatus} WHERE id = ${investorId}
    `

    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId,
        actorEmail: auth.email,
        action: `KYC_${action.toUpperCase()}D`,
        entityType: 'KYCSubmission',
        metadata: { investorId, adminNotes },
      },
    })

    return ok({ message: `KYC ${action}d successfully` })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}