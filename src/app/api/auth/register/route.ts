// src/app/api/auth/register/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { ok, error } from '@/lib/api'
import { sendVerificationEmail } from '@/lib/email'
import { randomBytes } from 'crypto'
import { validateNigerianPhone } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, phone, whatsapp, nationality, dateOfBirth, referralCode } = await req.json()

    if (!fullName || !email || !password) return error('Full name, email and password are required')
    if (password.length < 8) return error('Password must be at least 8 characters')

    // WhatsApp validation
    if (!whatsapp) return error('WhatsApp number is required')
    if (!validateNigerianPhone(whatsapp)) {
      return error('Please enter a valid WhatsApp number (e.g. 08012345678 — 11 digits for Nigerian numbers)')
    }

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
      data: { fullName, email: email.toLowerCase(), phone: phone || null, passwordHash },
    })

    await prisma.$executeRaw`
      UPDATE investors
      SET nationality = ${nationality || 'Nigeria'},
          "dateOfBirth" = ${dateOfBirth},
          phone = COALESCE(${whatsapp}, phone)
      WHERE id = ${investor.id}
    `

    // Handle referral pool join
    let referralPoolJoined = null
    if (referralCode) {
      const pool = await prisma.referralPool.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      })
      if (pool && pool.status === 'OPEN') {
        const alreadyMember = await prisma.referralMember.findUnique({
          where: { referralPoolId_investorId: { referralPoolId: pool.id, investorId: investor.id } },
        })
        if (!alreadyMember) {
          const CATEGORY_MIN: Record<string, number> = {
            CENT: 10, STANDARD_1K: 100, STANDARD_5K: 1000, STANDARD_10K: 2500,
          }
          await prisma.referralMember.create({
            data: {
              referralPoolId: pool.id,
              investorId: investor.id,
              contribution: CATEGORY_MIN[pool.category] ?? 10,
              status: 'PENDING_PAYMENT',
            },
          })
          referralPoolJoined = { poolId: pool.id, category: pool.category, referralCode: pool.referralCode }
        }
      }
    }

    // Email verification
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
        twoFaEnabled: false,
      },
      referralPoolJoined,
    }, 201)
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}
