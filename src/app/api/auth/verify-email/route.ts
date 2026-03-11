// src/app/api/auth/verify-email/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return error('Token is required')

    const records = await prisma.$queryRaw<any[]>`
      SELECT ev.*, i.email, i."fullName", i."kycStatus"
      FROM email_verifications ev
      JOIN investors i ON ev."investorId" = i.id
      WHERE ev.token = ${token}
        AND ev."usedAt" IS NULL
        AND ev."expiresAt" > NOW()
    `
    if (!records.length) return error('Invalid or expired verification link', 400)

    const record = records[0]

    await prisma.$executeRaw`
      UPDATE email_verifications SET "usedAt" = NOW() WHERE id = ${record.id}
    `
    await prisma.$executeRaw`
      UPDATE investors SET "emailVerified" = TRUE WHERE id = ${record.investorId}
    `

    // Issue a JWT so the frontend can auto-login and proceed to KYC
    const authToken = signToken({
      memberId: record.investorId,
      email: record.email,
      isAdmin: false,
    })

    return ok({
      message: 'Email verified successfully',
      token: authToken,
      member: {
        id: record.investorId,
        email: record.email,
        fullName: record.fullName,
        isAdmin: false,
        emailVerified: true,
        kycStatus: record.kycStatus || 'NOT_SUBMITTED',
        twoFaEnabled: false,
      },
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
