// src/app/api/auth/login/route.ts (updated for 2FA)
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return error('Email and password required')

  const investors = await prisma.$queryRaw<any[]>`
    SELECT id, email, "fullName", "passwordHash", "isAdmin", "twoFaEnabled", "twoFaMethod", "lastLoginAt"
    FROM investors WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `
  if (!investors.length) return error('Invalid email or password')
  const inv = investors[0]

  const valid = await bcrypt.compare(password, inv.passwordHash)
  if (!valid) return error('Invalid email or password')

  // Determine if 2FA required:
  // - 2FA is enabled AND (never logged in OR last login > 24 hours ago)
  const now = Date.now()
  const lastLogin = inv.lastLoginAt ? new Date(inv.lastLoginAt).getTime() : 0
  const hoursSinceLast = (now - lastLogin) / (1000 * 60 * 60)
  const require2FA = inv.twoFaEnabled && (hoursSinceLast > 24 || !inv.lastLoginAt)

  if (require2FA) {
    // Return partial — client must complete 2FA
    return ok({
      requiresTwoFa: true,
      twoFaMethod: inv.twoFaMethod || 'TOTP',
      investorId: inv.id,  // used by 2FA verify endpoint
      // No JWT yet
    })
  }

  // No 2FA needed — issue token
  await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${inv.id}`

  const token = jwt.sign(
    { memberId: inv.id, email: inv.email, isAdmin: inv.isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  return ok({ token, requiresTwoFa: false })
}
