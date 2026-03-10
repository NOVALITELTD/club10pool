// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return error('Email and password are required')
    const normalizedEmail = email.toLowerCase()

    // ── Admin (User table) ─────────────────────────────────
    const adminUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (adminUser) {
      const valid = await comparePassword(password, adminUser.passwordHash)
      if (!valid) return error('Invalid credentials', 401)
      const token = signToken({ memberId: adminUser.id, email: adminUser.email, isAdmin: true })
      await prisma.auditLog.create({
        data: { actorId: adminUser.id, actorEmail: adminUser.email, action: 'LOGIN' },
      })
      return ok({
        token,
        member: {
          id: adminUser.id,
          fullName: adminUser.name,
          email: adminUser.email,
          isAdmin: true,
          role: adminUser.role,
          emailVerified: true,
          kycStatus: 'APPROVED',
        },
      })
    }

    // ── Investor ───────────────────────────────────────────
    const investor = await prisma.investor.findUnique({ where: { email: normalizedEmail } })
    if (!investor) return error('Invalid credentials', 401)
    if (!investor.passwordHash) return error('Account has no password set. Contact admin.', 401)

    const valid = await comparePassword(password, investor.passwordHash)
    if (!valid) return error('Invalid credentials', 401)

    // Fetch 2FA fields + emailVerified + kycStatus via raw (not yet in Prisma model)
    const investorData = await prisma.$queryRaw<any[]>`
      SELECT "emailVerified", "kycStatus", "twoFaEnabled", "twoFaMethod", "lastLoginAt"
      FROM investors WHERE id = ${investor.id} LIMIT 1
    `
    const row = investorData[0] ?? {}
    const emailVerified = row.emailVerified ?? false
    const kycStatus = row.kycStatus ?? 'NOT_SUBMITTED'

    // ── 2FA gate ───────────────────────────────────────────
    // Required if: 2FA enabled AND (never logged in OR last login > 24h ago)
    const hoursSinceLast = row.lastLoginAt
      ? (Date.now() - new Date(row.lastLoginAt).getTime()) / 36e5
      : Infinity
    const require2FA = row.twoFaEnabled && hoursSinceLast > 24

    if (require2FA) {
      return ok({
        requiresTwoFa: true,
        twoFaMethod: row.twoFaMethod || 'TOTP',
        investorId: investor.id,
      })
    }

    // ── Issue token ────────────────────────────────────────
    await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${investor.id}`

    const token = signToken({ memberId: investor.id, email: investor.email, isAdmin: false })
    await prisma.auditLog.create({
      data: { actorId: investor.id, actorEmail: investor.email, action: 'LOGIN' },
    })

    return ok({
      token,
      requiresTwoFa: false,
      member: {
        id: investor.id,
        fullName: investor.fullName,
        email: investor.email,
        isAdmin: false,
        emailVerified,
        kycStatus,
      },
    })

  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
