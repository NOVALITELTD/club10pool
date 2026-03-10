// src/lib/whatsapp.ts
// Free WhatsApp notifications via CallMeBot API
// Setup: Admin must send "I allow callmebot to send me messages" to +34 644 597 103 on WhatsApp first
// Then visit: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// CallMeBot will reply with your personal API key — set it in env as CALLMEBOT_API_KEY

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php'

// Format Nigerian number: strip leading 0, add +234
export function formatNigerianWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`
  if (digits.length === 10) return `+234${digits}`
  return `+${digits}` // international, pass through
}

export function validateNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  // Nigerian numbers: 11 digits starting with 0, or 13 digits starting with 234
  return (digits.length === 11 && digits.startsWith('0')) ||
         (digits.length === 13 && digits.startsWith('234')) ||
         (digits.length === 10) // without leading 0
}

async function sendWhatsApp(phone: string, message: string, apiKey: string): Promise<void> {
  const formatted = formatNigerianWhatsApp(phone)
  const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(formatted)}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  try {
    const res = await fetch(url)
    if (!res.ok) console.error(`WhatsApp send failed for ${formatted}:`, await res.text())
  } catch (e) {
    console.error('WhatsApp notification error:', e)
  }
}

// ── ADMIN NOTIFICATIONS ────────────────────────────────────────────────────

export async function notifyAdminWhatsApp(message: string): Promise<void> {
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER
  const apiKey = process.env.CALLMEBOT_API_KEY
  if (!adminPhone || !apiKey) return
  await sendWhatsApp(adminPhone, `🏦 *Club10 Pool*\n\n${message}`, apiKey)
}

export async function notifyAdminKYC(investorName: string, investorEmail: string): Promise<void> {
  await notifyAdminWhatsApp(`📋 *KYC Submitted*\n\nInvestor: ${investorName}\nEmail: ${investorEmail}\n\nReview required on admin dashboard.`)
}

export async function notifyAdminWithdrawal(investorName: string, amount: number, wallet: string): Promise<void> {
  await notifyAdminWhatsApp(`💸 *Withdrawal Request*\n\nInvestor: ${investorName}\nAmount: $${amount}\nWallet: ${wallet}\n\nAction required on admin dashboard.`)
}

export async function notifyAdminPoolFull(poolCode: string, category: string, totalAmount: number): Promise<void> {
  await notifyAdminWhatsApp(`🎯 *Pool Full - Action Required*\n\nPool: ${poolCode}\nCategory: ${category}\nTotal: $${totalAmount}\n\nPlease activate the batch on admin dashboard.`)
}

export async function notifyAdminNewInvestor(investorName: string, email: string): Promise<void> {
  await notifyAdminWhatsApp(`👤 *New Registration*\n\nName: ${investorName}\nEmail: ${email}\n\nAwaiting KYC submission.`)
}

// ── INVESTOR NOTIFICATIONS ─────────────────────────────────────────────────

export async function notifyInvestorWhatsApp(phone: string, message: string): Promise<void> {
  const apiKey = process.env.CALLMEBOT_INVESTOR_API_KEY || process.env.CALLMEBOT_API_KEY
  if (!phone || !apiKey) return
  await sendWhatsApp(phone, `🏦 *Club10 Pool*\n\n${message}`, apiKey)
}

export async function notifyInvestorKYCApproved(phone: string, name: string): Promise<void> {
  await notifyInvestorWhatsApp(phone, `✅ *KYC Approved*\n\nHi ${name}, your identity has been verified!\n\nYou can now join a pool and start investing. Log in to your dashboard to get started.`)
}

export async function notifyInvestorKYCRejected(phone: string, name: string, reason?: string): Promise<void> {
  await notifyInvestorWhatsApp(phone, `❌ *KYC Rejected*\n\nHi ${name}, your KYC submission was not approved.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please re-submit your documents on the dashboard.`)
}

export async function notifyInvestorPaymentConfirmed(phone: string, name: string, amount: number, batchName: string): Promise<void> {
  await notifyInvestorWhatsApp(phone, `💰 *Payment Confirmed*\n\nHi ${name}, your payment of $${amount} for *${batchName}* has been confirmed!\n\nYou are now an active pool member.`)
}

export async function notifyInvestorBatchActive(phone: string, name: string, batchName: string): Promise<void> {
  await notifyInvestorWhatsApp(phone, `🚀 *Your Batch is Live!*\n\nHi ${name}, *${batchName}* has been activated.\n\nLog in to your dashboard to access your MT4 trading credentials.`)
}

export async function notifyInvestorWithdrawalProcessed(phone: string, name: string, amount: number): Promise<void> {
  await notifyInvestorWhatsApp(phone, `✅ *Withdrawal Processed*\n\nHi ${name}, your withdrawal of $${amount} has been sent to your USDT wallet.\n\nThank you for investing with Club10 Pool.`)
}
