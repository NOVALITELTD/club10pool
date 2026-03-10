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

    // ── Admin (User table) — Prisma model is fine here ────
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

    // ── Investor — single raw query for ALL fields ─────────
    // Using prisma.investor.findUnique() would miss columns added
    // after the last prisma generate (twoFaEnabled, lastLoginAt etc.)
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", "passwordHash",
             "emailVerified", "kycStatus",
             "twoFaEnabled", "twoFaMethod", "lastLoginAt"
      FROM investors
      WHERE LOWER(email) = LOWER(${normalizedEmail})
      LIMIT 1
    `
    if (!rows.length) return error('Invalid credentials', 401)
    const inv = rows[0]

    if (!inv.passwordHash) return error('Account has no password set. Contact admin.', 401)

    const valid = await comparePassword(password, inv.passwordHash)
    if (!valid) return error('Invalid credentials', 401)

    // ── 2FA gate ───────────────────────────────────────────
    const hoursSinceLast = inv.lastLoginAt
      ? (Date.now() - new Date(inv.lastLoginAt).getTime()) / 36e5
      : Infinity
    const require2FA = inv.twoFaEnabled && hoursSinceLast > 24

    if (require2FA) {
      return ok({
        requiresTwoFa: true,
        twoFaMethod: inv.twoFaMethod || 'TOTP',
        investorId: inv.id,
      })
    }

    // ── Issue token ────────────────────────────────────────
    await prisma.$executeRaw`UPDATE investors SET "lastLoginAt" = NOW() WHERE id = ${inv.id}`

    const token = signToken({ memberId: inv.id, email: inv.email, isAdmin: false })
    await prisma.auditLog.create({
      data: { actorId: inv.id, actorEmail: inv.email, action: 'LOGIN' },
    })

    return ok({
      token,
      requiresTwoFa: false,
      member: {
        id: inv.id,
        fullName: inv.fullName,
        email: inv.email,
        isAdmin: false,
        emailVerified: inv.emailVerified ?? false,
        kycStatus: inv.kycStatus ?? 'NOT_SUBMITTED',
      },
    })

  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
