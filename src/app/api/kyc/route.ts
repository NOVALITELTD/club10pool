import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  try {
    const { idType, idFrontUrl, idBackUrl, passportPhotoUrl, proofOfAddressUrl } = await req.json()
    if (!idType || !idFrontUrl || !idBackUrl || !passportPhotoUrl || !proofOfAddressUrl) {
      return error('All KYC documents are required')
    }

    const existing = await prisma.$queryRaw<any[]>`
      SELECT id, status FROM kyc_submissions WHERE "investorId" = ${auth.memberId}
    `

    if (existing.length > 0) {
      const currentStatus = existing[0].status
      // Block resubmission if already pending or approved
      if (currentStatus === 'PENDING') return error('KYC already submitted and under review', 409)
      if (currentStatus === 'APPROVED') return error('KYC already approved', 409)

      // Allow resubmission if REJECTED — update existing row
      await prisma.$executeRaw`
        UPDATE kyc_submissions
        SET
          "idType" = ${idType},
          "idFrontUrl" = ${idFrontUrl},
          "idBackUrl" = ${idBackUrl},
          "passportPhotoUrl" = ${passportPhotoUrl},
          "proofOfAddressUrl" = ${proofOfAddressUrl},
          status = 'PENDING',
          "adminNotes" = NULL,
          "reviewedAt" = NULL,
          "reviewedBy" = NULL,
          "submittedAt" = NOW()
        WHERE "investorId" = ${auth.memberId}
      `
    } else {
      // First time submission — insert new row
      await prisma.$executeRaw`
        INSERT INTO kyc_submissions (id, "investorId", "idType", "idFrontUrl", "idBackUrl", "passportPhotoUrl", "proofOfAddressUrl")
        VALUES (${crypto.randomUUID()}, ${auth.memberId}, ${idType}, ${idFrontUrl}, ${idBackUrl}, ${passportPhotoUrl}, ${proofOfAddressUrl})
      `
    }

    await prisma.$executeRaw`
      UPDATE investors SET "kycStatus" = 'PENDING' WHERE id = ${auth.memberId}
    `

    return ok({ message: 'KYC submitted successfully' }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  const records = await prisma.$queryRaw<any[]>`
    SELECT * FROM kyc_submissions WHERE "investorId" = ${auth.memberId}
  `
  return ok(records[0] || null)
}
