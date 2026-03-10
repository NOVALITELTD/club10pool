import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, phone, nationality, dateOfBirth } = await req.json()

    if (!fullName || !email || !password) {
      return error('Full name, email and password are required')
    }
    if (password.length < 8) {
      return error('Password must be at least 8 characters')
    }

    // Age validation (DD-MM-YYYY)
    if (!dateOfBirth) return error('Date of birth is required')
    const parts = dateOfBirth.split('-')
    if (parts.length !== 3) return error('Invalid date of birth format (DD-MM-YYYY)')
    const [dd, mm, yyyy] = parts
    const birth = new Date(`${yyyy}-${mm}-${dd}`)
    if (isNaN(birth.getTime())) return error('Invalid date of birth')
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    if (age < 18) return error('You must be at least 18 years old to register')

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

    // Save nationality + dateOfBirth via raw (not yet in Prisma schema)
    await prisma.$executeRaw`
      UPDATE investors
      SET nationality = ${nationality || 'Nigeria'},
          "dateOfBirth" = ${dateOfBirth}
      WHERE id = ${investor.id}
    `

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
