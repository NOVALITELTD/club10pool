import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'
import { sendEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()
  const submissions = await prisma.$queryRaw<any[]>`
    SELECT k.*, i."fullName", i.email 
    FROM kyc_submissions k
    JOIN investors i ON k."investorId" = i.id
    ORDER BY k."submittedAt" DESC
  `
  return ok(submissions)
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  try {
    const { investorId, action, adminNotes } = await req.json()
    if (!['approve', 'reject'].includes(action)) return error('action must be approve or reject')

    const kycStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    // Get investor details for email
    const investor = await prisma.investor.findUnique({ where: { id: investorId } })
    if (!investor) return error('Investor not found', 404)

    await prisma.$executeRaw`
      UPDATE kyc_submissions 
      SET status = ${kycStatus}, "adminNotes" = ${adminNotes || null}, "reviewedAt" = NOW(), "reviewedBy" = ${auth.email}
      WHERE "investorId" = ${investorId}
    `
    await prisma.$executeRaw`
      UPDATE investors SET "kycStatus" = ${kycStatus} WHERE id = ${investorId}
    `
    await prisma.auditLog.create({
      data: {
        actorId: auth.memberId,
        actorEmail: auth.email,
        action: `KYC_${action.toUpperCase()}D`,
        entityType: 'KYCSubmission',
        metadata: { investorId, adminNotes },
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || ''
    const firstName = investor.fullName?.split(' ')[0] || 'Member'

    // Send approval email
    if (action === 'approve') {
      await sendEmail({
        to: investor.email,
        subject: '✅ KYC Approved — Welcome to Club10 Pool',
        html: `
          <div style="background:#080a0f;color:#e2e8f0;padding:40px;font-family:monospace;max-width:520px;margin:0 auto;border-radius:12px;">
            <div style="text-align:center;margin-bottom:28px;">
              <img src="${baseUrl}/logo.png" alt="Club10 Pool" style="width:52px;height:52px;border-radius:12px;object-fit:contain;display:block;margin:0 auto 12px;" />
              <div style="font-size:12px;color:#00d4aa;letter-spacing:3px;margin-bottom:4px;">NOVA-LITE CLUB10 POOL</div>
              <div style="font-size:22px;font-weight:800;">KYC Approved!</div>
            </div>

            <div style="background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.25);border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
              <div style="font-size:36px;margin-bottom:8px;">✅</div>
              <div style="font-size:16px;font-weight:700;color:#00d4aa;">Your identity has been verified</div>
            </div>

            <p style="color:#cbd5e1;font-size:15px;line-height:1.8;margin-bottom:20px;">
              Hi <strong style="color:#f1f5f9;">${firstName}</strong>,
            </p>
            <p style="color:#cbd5e1;font-size:15px;line-height:1.8;margin-bottom:28px;">
              Great news! Your KYC verification has been reviewed and <strong style="color:#00d4aa;">approved</strong>. Your Club10 Pool account is now fully activated and ready to use.
            </p>

            <div style="background:#0d1117;border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px;margin-bottom:28px;">
              <div style="font-size:12px;color:#c9a84c;letter-spacing:2px;margin-bottom:12px;">WHAT YOU CAN DO NOW</div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${['Sign in to your dashboard', 'Browse open batch pools to join', 'Monitor live trading via MT4', 'Request monthly withdrawals'].map(item => `
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="color:#00d4aa;font-size:12px;">◆</span>
                    <span style="color:#94a3b8;font-size:14px;">${item}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${baseUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#a07830);color:#000;font-weight:800;font-size:15px;padding:16px 40px;border-radius:10px;text-decoration:none;">
                Go to Dashboard →
              </a>
            </div>

            <p style="color:#475569;font-size:12px;line-height:1.7;text-align:center;">
              Welcome to the Club10 Pool community.<br/>
              For support: <a href="mailto:nova.liteltd@gmail.com" style="color:#c9a84c;">nova.liteltd@gmail.com</a>
            </p>
          </div>
        `,
      })
    }

    // Send rejection email
    if (action === 'reject') {
      const { signToken } = await import('@/lib/auth')
      const resubmitToken = signToken({ memberId: investor.id, email: investor.email, isAdmin: false })
      const resubmitUrl = `${baseUrl}/kyc?token=${resubmitToken}`
      const reason = adminNotes || 'Your documents did not meet our verification requirements.'

      await sendEmail({
        to: investor.email,
        subject: '❌ KYC Verification Unsuccessful — Action Required',
        html: `
          <div style="background:#080a0f;color:#e2e8f0;padding:40px;font-family:monospace;max-width:520px;margin:0 auto;border-radius:12px;">
            <div style="text-align:center;margin-bottom:28px;">
              <img src="${baseUrl}/logo.png" alt="Club10 Pool" style="width:52px;height:52px;border-radius:12px;object-fit:contain;display:block;margin:0 auto 12px;" />
              <div style="font-size:12px;color:#c9a84c;letter-spacing:3px;margin-bottom:4px;">NOVA-LITE CLUB10 POOL</div>
              <div style="font-size:22px;font-weight:800;">KYC Verification Unsuccessful</div>
            </div>

            <p style="color:#cbd5e1;font-size:15px;line-height:1.8;margin-bottom:20px;">
              Hi <strong style="color:#f1f5f9;">${firstName}</strong>,
            </p>
            <p style="color:#cbd5e1;font-size:15px;line-height:1.8;margin-bottom:24px;">
              Unfortunately, your KYC submission could not be approved at this time. Please review the reason below and resubmit with the correct documents.
            </p>

            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px;margin-bottom:28px;">
              <div style="font-size:12px;color:#ef4444;letter-spacing:2px;margin-bottom:10px;">REASON FOR REJECTION</div>
              <div style="font-size:15px;color:#fca5a5;line-height:1.7;">${reason}</div>
            </div>

            <div style="background:#0d1117;border:1px solid rgba(201,168,76,0.15);border-radius:12px;padding:20px;margin-bottom:28px;">
              <div style="font-size:12px;color:#c9a84c;letter-spacing:2px;margin-bottom:12px;">TIPS FOR RESUBMISSION</div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${[
                  'Ensure all 4 documents are clearly visible and not blurry',
                  'Make sure ID documents are valid and not expired',
                  'Passport photo should show a clear face on white background',
                  'Proof of address must be dated within the last 3 months',
                  'Files must be under 3MB each and 5MB total',
                ].map(tip => `
                  <div style="display:flex;align-items:flex-start;gap:10px;">
                    <span style="color:#c9a84c;font-size:12px;margin-top:2px;">◆</span>
                    <span style="color:#94a3b8;font-size:13px;line-height:1.6;">${tip}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${resubmitUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#a07830);color:#000;font-weight:800;font-size:15px;padding:16px 40px;border-radius:10px;text-decoration:none;">
                Resubmit KYC Documents →
              </a>
            </div>

            <p style="color:#475569;font-size:12px;line-height:1.7;text-align:center;">
              Need help? Contact our support team:<br/>
              <a href="mailto:nova.liteltd@gmail.com" style="color:#c9a84c;">nova.liteltd@gmail.com</a> · 
              <a href="https://t.me/novalitesignal" style="color:#c9a84c;">Telegram</a>
            </p>
          </div>
        `,
      })
    }

    return ok({ message: `KYC ${action}d successfully` })
  } catch (e) {
    console.error(e)
    return error('Server error', 500)
  }
}

