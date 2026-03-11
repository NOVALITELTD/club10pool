// src/app/api/auth/forgot-password/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return error('Email is required')

    const investor = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } })

    // Always return ok to prevent email enumeration
    if (!investor || !investor.passwordHash) {
      return ok({ message: 'If that email exists, a reset link has been sent' })
    }

    const token = randomBytes(32).toString('hex')

    // Omit id — let DB default gen_random_uuid() handle it
    await prisma.$executeRaw`
      INSERT INTO password_resets ("investorId", token, "expiresAt")
      VALUES (${investor.id}, ${token}, ${new Date(Date.now() + 60 * 60 * 1000)})
    `

    await sendPasswordResetEmail(investor.email, investor.fullName, token)
    return ok({ message: 'If that email exists, a reset link has been sent' })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
