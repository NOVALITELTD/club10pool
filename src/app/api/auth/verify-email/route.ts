import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return error('Token is required')

    const records = await prisma.$queryRaw<any[]>`
      SELECT * FROM email_verifications 
      WHERE token = ${token} AND "usedAt" IS NULL AND "expiresAt" > NOW()
    `
    if (!records.length) return error('Invalid or expired verification link', 400)

    const record = records[0]

    await prisma.$executeRaw`
      UPDATE email_verifications SET "usedAt" = NOW() WHERE id = ${record.id}
    `
    await prisma.$executeRaw`
      UPDATE investors SET "emailVerified" = TRUE WHERE id = ${record.investorId}
    `

    return ok({ message: 'Email verified successfully' })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}