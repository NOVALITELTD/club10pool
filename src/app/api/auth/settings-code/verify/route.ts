import { NextRequest } from 'next/server'
import { ok, error, unauthorized } from '@/lib/api'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!auth) return unauthorized()
    const payload = verifyToken(auth) as any
    if (!payload || payload.isAdmin) return unauthorized()

    const { code } = await req.json()
    if (!code || code.length !== 6) return error('Invalid code format')

    // Look up the code (stored with SC- prefix)
    const record = await prisma.$queryRaw<any[]>`
      SELECT * FROM email_verifications
      WHERE "investorId" = ${payload.id}
        AND token = ${'SC-' + code}
        AND "expiresAt" > NOW()
        AND "usedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (!record || record.length === 0) return error('Invalid or expired code')

    // Mark as used
    await prisma.$executeRaw`
      UPDATE email_verifications
      SET "usedAt" = NOW()
      WHERE id = ${record[0].id}
    `

    return ok({ message: 'Verified' })
  } catch (err) {
    console.error(err)
    return error('Verification failed')
  }

}
