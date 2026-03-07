import { NextRequest } from 'next/server'
import { ok, error, unauthorized } from '@/lib/api'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!auth) return unauthorized()
    const payload = verifyToken(auth) as any
    if (!payload || payload.isAdmin) return unauthorized()

    const investor = await prisma.investor.findUnique({ where: { id: payload.memberId } })
    if (!investor) return error('Investor not found', 404)

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in email_verifications table (reusing existing table, distinct token prefix)
    await prisma.$executeRaw`
      INSERT INTO email_verifications ("investorId", token, "expiresAt", "createdAt")
      VALUES (${investor.id}, ${'SC-' + code}, ${expiresAt}, NOW())
    `

    // Send email
    await sendEmail({
      to: investor.email,
      subject: 'Club10 Pool — Settings Verification Code',
      html: `
        <div style="background:#080a0f;color:#e2e8f0;padding:40px;font-family:monospace;max-width:480px;margin:0 auto;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;color:#00d4aa;letter-spacing:3px;margin-bottom:4px;">NOVA-LITE CLUB10 POOL</div>
            <div style="font-size:20px;font-weight:800;">Settings Verification</div>
          </div>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:28px;">
            Someone requested to edit account settings for <strong style="color:#e2e8f0;">${investor.email}</strong>. Use the code below to proceed.
          </p>
          <div style="background:#0d1117;border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
            <div style="font-size:11px;color:#64748b;letter-spacing:3px;margin-bottom:12px;">VERIFICATION CODE</div>
            <div style="font-size:42px;font-weight:900;color:#c9a84c;letter-spacing:12px;">${code}</div>
            <div style="font-size:12px;color:#475569;margin-top:12px;">Expires in 10 minutes</div>
          </div>
          <p style="color:#475569;font-size:12px;line-height:1.6;">
            If you did not request this, your account settings have not been changed. You can safely ignore this email.
          </p>
        </div>
      `,
    })

    return ok({ message: 'Verification code sent' })
  } catch (err) {
    console.error(err)
    return error('Failed to send verification code')
  }

}

