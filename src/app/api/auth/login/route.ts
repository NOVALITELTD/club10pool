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

    // Check admin User first
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
        member: { id: adminUser.id, fullName: adminUser.name, email: adminUser.email, isAdmin: true, role: adminUser.role },
      })
    }

    // Check Investor
    const investor = await prisma.investor.findUnique({ where: { email: normalizedEmail } })
    if (!investor) return error('Invalid credentials', 401)
    if (!investor.passwordHash) return error('Account has no password set. Contact admin.', 401)

    const valid = await comparePassword(password, investor.passwordHash)
    if (!valid) return error('Invalid credentials', 401)

    const token = signToken({ memberId: investor.id, email: investor.email, isAdmin: false })
    await prisma.auditLog.create({
      data: { actorId: investor.id, actorEmail: investor.email, action: 'LOGIN' },
    })
    return ok({
      token,
      member: { id: investor.id, fullName: investor.fullName, email: investor.email, isAdmin: false },
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
