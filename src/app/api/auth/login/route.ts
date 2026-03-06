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

    const member = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!member) return error('Invalid credentials', 401)

    const valid = await comparePassword(password, member.passwordHash)
    if (!valid) return error('Invalid credentials', 401)

    const token = signToken({ memberId: member.id, email: member.email, isAdmin: member.isAdmin })

    await prisma.auditLog.create({
      data: { actorId: member.id, actorEmail: member.email, action: 'LOGIN' },
    })

    return ok({
      token,
      member: {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        isAdmin: member.isAdmin,
        status: member.status,
      },
    })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
