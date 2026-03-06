import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

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

    // Create verification token
    const token = randomBytes(32).toString('hex')
    await prisma.$executeRaw`
      INSERT INTO email_verifications (id, "investorId", token, "expiresAt")
      VALUES (${crypto.randomUUID()}, ${investor.id}, ${token}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)})
    `

    await sendVerificationEmail(investor.email, investor.fullName, token)

    const authToken = signToken({ memberId: investor.id, email: investor.email, isAdmin: false })

    return ok({
      token: authToken,
      member: {
        id: investor.id,
        fullName: investor.fullName,
        email: investor.email,
        isAdmin: false,
        emailVerified: false,
        kycStatus: 'NOT_SUBMITTED',
      },
    }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
