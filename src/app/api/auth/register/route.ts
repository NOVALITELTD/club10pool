import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, phone } = await req.json()

    if (!fullName || !email || !password) {
      return error('Full name, email and password are required')
    }
    if (password.length < 8) {
      return error('Password must be at least 8 characters')
    }

    const existing = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return error('Email already registered', 409)

    const passwordHash = await hashPassword(password)
    const investor = await prisma.investor.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone: phone || null,
        passwordHash,
      },
    })

    const token = signToken({ memberId: investor.id, email: investor.email, isAdmin: false })

    await prisma.auditLog.create({
      data: { actorId: investor.id, actorEmail: investor.email, action: 'REGISTER' },
    })

    return ok({
      token,
      member: {
        id: investor.id,
        fullName: investor.fullName,
        email: investor.email,
        isAdmin: false,
      },
    }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}