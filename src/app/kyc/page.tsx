// src/app/api/kyc/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { notifyAdminKYCSubmitted } from '@/lib/whatsapp'

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
      if (currentStatus === 'PENDING') return error('KYC already submitted and under review', 409)
      if (currentStatus === 'APPROVED') return error('KYC already approved', 409)

      // REJECTED — allow resubmission
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
      // Use gen_random_uuid() from Postgres instead of crypto.randomUUID()
      await prisma.$executeRaw`
        INSERT INTO kyc_submissions (id, "investorId", "idType", "idFrontUrl", "idBackUrl", "passportPhotoUrl", "proofOfAddressUrl")
        VALUES (gen_random_uuid()::text, ${auth.memberId}, ${idType}, ${idFrontUrl}, ${idBackUrl}, ${passportPhotoUrl}, ${proofOfAddressUrl})
      `
    }

    await prisma.$executeRaw`
      UPDATE investors SET "kycStatus" = 'PENDING' WHERE id = ${auth.memberId}
    `

    const inv = await prisma.$queryRaw<any[]>`
      SELECT "fullName", email FROM investors WHERE id = ${auth.memberId} LIMIT 1
    `
    if (inv.length) {
      notifyAdminKYCSubmitted(inv[0].fullName, inv[0].email).catch(() => {})
    }

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
    ORDER BY "submittedAt" DESC LIMIT 1
  `
  return ok(records[0] || null)
}
