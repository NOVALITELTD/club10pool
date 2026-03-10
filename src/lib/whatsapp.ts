// src/lib/whatsapp.ts
// WhatsApp notifications via CallMeBot (free)
// Setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php'

export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`
  if (digits.length === 10) return `+234${digits}`
  return `+${digits}`
}

export function validateNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return (digits.length === 11 && digits.startsWith('0')) ||
         (digits.length === 13 && digits.startsWith('234')) ||
         (digits.length === 10)
}

async function sendWhatsApp(phone: string, apiKey: string, message: string): Promise<boolean> {
  const formatted = formatWhatsAppNumber(phone)
  const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(formatted)}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  try {
    const res = await fetch(url)
    return res.ok
  } catch (e) {
    console.error('WhatsApp send error:', e)
    return false
  }
}

// ── ADMIN NOTIFICATIONS (uses env vars) ───────────────────────────────────

export async function notifyAdminWhatsApp(message: string): Promise<void> {
  const phone = process.env.ADMIN_WHATSAPP_NUMBER
  const apiKey = process.env.CALLMEBOT_API_KEY
  if (!phone || !apiKey) return
  await sendWhatsApp(phone, apiKey, `🏦 *Club10 Pool — Admin*\n\n${message}`)
}

export async function notifyAdminKYCSubmitted(investorName: string, email: string): Promise<void> {
  await notifyAdminWhatsApp(`📋 *KYC Submitted*\n\nInvestor: ${investorName}\nEmail: ${email}\n\nReview required on admin dashboard.`)
}

export async function notifyAdminWithdrawal(investorName: string, amount: number, wallet: string): Promise<void> {
  await notifyAdminWhatsApp(`💸 *Withdrawal Request*\n\nInvestor: ${investorName}\nAmount: $${amount}\nWallet: ${wallet}\n\nAction required on admin dashboard.`)
}

export async function notifyAdminPoolFull(poolCode: string, category: string, totalAmount: number): Promise<void> {
  await notifyAdminWhatsApp(`🎯 *Pool Full — Action Required*\n\nPool: ${poolCode}\nCategory: ${category}\nTotal: $${totalAmount}\n\nPlease activate the batch.`)
}

export async function notifyAdminNewRegistration(investorName: string, email: string): Promise<void> {
  await notifyAdminWhatsApp(`👤 *New Registration*\n\nName: ${investorName}\nEmail: ${email}`)
}

// ── INVESTOR NOTIFICATIONS (uses investor's own CallMeBot key) ────────────

export async function notifyInvestor(
  whatsappNumber: string,
  apiKey: string,
  message: string
): Promise<void> {
  if (!whatsappNumber || !apiKey) return
  await sendWhatsApp(whatsappNumber, apiKey, `🏦 *Club10 Pool*\n\n${message}`)
}

export async function notifyInvestorKYCApproved(whatsappNumber: string, apiKey: string, name: string): Promise<void> {
  await notifyInvestor(whatsappNumber, apiKey,
    `✅ *KYC Approved!*\n\nHi ${name}, your identity has been verified.\n\nYou can now join a pool. Log in to get started.`)
}

export async function notifyInvestorKYCRejected(whatsappNumber: string, apiKey: string, name: string, reason?: string): Promise<void> {
  await notifyInvestor(whatsappNumber, apiKey,
    `❌ *KYC Rejected*\n\nHi ${name}, your KYC was not approved.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please re-submit your documents on the dashboard.`)
}

export async function notifyInvestorBatchActive(whatsappNumber: string, apiKey: string, name: string, batchName: string): Promise<void> {
  await notifyInvestor(whatsappNumber, apiKey,
    `🚀 *Batch Activated!*\n\nHi ${name}, *${batchName}* is now live.\n\nLog in to access your MT4 trading credentials.`)
}

export async function notifyInvestorWithdrawalProcessed(whatsappNumber: string, apiKey: string, name: string, amount: number): Promise<void> {
  await notifyInvestor(whatsappNumber, apiKey,
    `✅ *Withdrawal Sent*\n\nHi ${name}, your withdrawal of $${amount} has been processed to your USDT wallet.`)
}

// ── HELPER: fetch investor notification settings from DB ──────────────────

export async function getInvestorNotifSettings(prisma: any, investorId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT "whatsappNumber", "callmebotApiKey", "notifyKyc", "notifyBatch", "notifyWithdrawal", "isVerified"
    FROM investor_notifications WHERE "investorId" = ${investorId} LIMIT 1
  `
  return rows[0] || null
}
