// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) return error('Email and password are required')

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return error('Invalid credentials', 401)

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) return error('Invalid credentials', 401)

    const token = signToken({ memberId: user.id, email: user.email, isAdmin: user.role === 'admin' })

    await prisma.auditLog.create({
      data: { actorId: user.id, actorEmail: user.email, action: 'LOGIN' },
    })

    return ok({
      token,
      member: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        isAdmin: user.role === 'admin',
        role: user.role,
      },
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
