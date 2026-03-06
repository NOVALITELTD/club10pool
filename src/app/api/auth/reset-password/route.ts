import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return error('Token and password are required')
    if (password.length < 8) return error('Password must be at least 8 characters')

    const records = await prisma.$queryRaw<any[]>`
      SELECT * FROM password_resets
      WHERE token = ${token} AND "usedAt" IS NULL AND "expiresAt" > NOW()
    `
    if (!records.length) return error('Invalid or expired reset link', 400)

    const record = records[0]
    const passwordHash = await hashPassword(password)

    await prisma.$executeRaw`
      UPDATE investors SET "passwordHash" = ${passwordHash} WHERE id = ${record.investorId}
    `
    await prisma.$executeRaw`
      UPDATE password_resets SET "usedAt" = NOW() WHERE id = ${record.id}
    `

    return ok({ message: 'Password reset successfully' })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}