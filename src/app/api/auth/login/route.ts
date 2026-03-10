// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return error('Email and password required')

  // Fetch investor — "isAdmin" may not exist as a column; derive from "role" if present
  // We use a safe select that works regardless of whether isAdmin or role is the column
  let investors: any[] = []
  try {
    investors = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", "passwordHash",
             COALESCE("isAdmin", false) AS "isAdmin",
             "twoFaEnabled", "twoFaMethod", "lastLoginAt"
      FROM investors WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `
  } catch {
    // Fallback: isAdmin column doesn't exist — try without it
    investors = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", "passwordHash",
             false AS "isAdmin",
             "twoFaEnabled", "twoFaMethod", "lastLoginAt"
      FROM investors WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `
  }

  if (!investors.length) return error('Invalid email or password')
  const inv = investors[0]

  const valid = await bcrypt.compare(password, inv.passwordHash)
  if (!valid) return error('Invalid email or password')

  // Check 2FA: required if enabled AND last login > 24h ago (or never)
  const now = Date.now()
  const lastLogin = inv.lastLoginAt ? new Date(inv.lastLoginAt).getTime() : 0
  const hoursSinceLast = (now - lastLogin) / (1000 * 60 * 60)
  const require2FA = inv.twoFaEnabled && (hoursSinceLast > 24 || !inv.lastLoginAt)

  if (require2FA) {
    return ok({
      requiresTwoFa: true,
      twoFaMethod: inv.twoFaMethod || 'TOTP',
      investorId: inv.id,
    })
  }

  // Issue JWT
  await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${inv.id}`

  // Also check admin status via separate query if needed
  let isAdmin = inv.isAdmin || false
  try {
    const adminCheck = await prisma.$queryRaw<any[]>`
      SELECT "isAdmin" FROM investors WHERE id = ${inv.id} LIMIT 1
    `
    isAdmin = adminCheck[0]?.isAdmin ?? false
  } catch { /* column doesn't exist, isAdmin stays false */ }

  const token = jwt.sign(
    { memberId: inv.id, email: inv.email, isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  // Fetch full profile for client localStorage
  const kycCheck = await prisma.$queryRaw<any[]>`
    SELECT status FROM kyc_submissions WHERE "investorId" = ${inv.id} ORDER BY "createdAt" DESC LIMIT 1
  `
  const kycStatus = kycCheck[0]?.status || 'NOT_SUBMITTED'

  return ok({
    token,
    requiresTwoFa: false,
    user: {
      id: inv.id,
      email: inv.email,
      fullName: inv.fullName,
      isAdmin,
      kycStatus,
    }
  })
}
