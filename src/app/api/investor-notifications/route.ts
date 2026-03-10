// src/app/api/investor-notifications/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest } from '@/lib/auth'
import { ok, error, unauthorized } from '@/lib/api'
import { formatWhatsAppNumber } from '@/lib/whatsapp'

// GET — fetch investor's own notification settings
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const rows = await prisma.$queryRaw<any[]>`
    SELECT "whatsappNumber", "callmebotApiKey", "notifyKyc", "notifyBatch",
           "notifyWithdrawal", "isVerified"
    FROM investor_notifications WHERE "investorId" = ${auth.memberId} LIMIT 1
  `
  return ok(rows[0] || null)
}

// POST — save/update notification settings
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const { whatsappNumber, callmebotApiKey, notifyKyc, notifyBatch, notifyWithdrawal } = await req.json()

  if (!whatsappNumber || !callmebotApiKey) return error('WhatsApp number and CallMeBot API key required')

  const formatted = formatWhatsAppNumber(whatsappNumber)

  // Test the API key by sending a verification message
  const testUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(formatted)}&text=${encodeURIComponent('✅ Club10 Pool notifications verified! You will now receive updates here.')}&apikey=${callmebotApiKey}`
  let verified = false
  try {
    const res = await fetch(testUrl)
    verified = res.ok
  } catch { verified = false }

  // Upsert
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM investor_notifications WHERE "investorId" = ${auth.memberId} LIMIT 1
  `

  if (existing.length) {
    await prisma.$executeRaw`
      UPDATE investor_notifications
      SET "whatsappNumber" = ${whatsappNumber},
          "callmebotApiKey" = ${callmebotApiKey},
          "notifyKyc" = ${notifyKyc ?? true},
          "notifyBatch" = ${notifyBatch ?? true},
          "notifyWithdrawal" = ${notifyWithdrawal ?? true},
          "isVerified" = ${verified},
          "updatedAt" = NOW()
      WHERE "investorId" = ${auth.memberId}
    `
  } else {
    await prisma.$executeRaw`
      INSERT INTO investor_notifications ("investorId", "whatsappNumber", "callmebotApiKey", "notifyKyc", "notifyBatch", "notifyWithdrawal", "isVerified", "createdAt", "updatedAt")
      VALUES (${auth.memberId}, ${whatsappNumber}, ${callmebotApiKey}, ${notifyKyc ?? true}, ${notifyBatch ?? true}, ${notifyWithdrawal ?? true}, ${verified}, NOW(), NOW())
    `
  }

  return ok({
    verified,
    message: verified
      ? '✅ WhatsApp notifications enabled! A test message was sent to your number.'
      : '⚠ Settings saved but test message failed. Check your number and API key.',
  })
}

// DELETE — disable notifications
export async function DELETE(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  await prisma.$executeRaw`
    UPDATE investor_notifications
    SET "isVerified" = false, "callmebotApiKey" = NULL, "updatedAt" = NOW()
    WHERE "investorId" = ${auth.memberId}
  `
  return ok({ disabled: true })
}