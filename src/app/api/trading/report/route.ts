// src/app/api/trading/report/route.ts
// Receives POST from MT4/MT5 EA — stores reports + notifies investors
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'
import nodemailer from 'nodemailer'

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

// ── WhatsApp via CallMeBot ────────────────────────────────
async function sendWhatsApp(phone: string, apiKey: string, message: string) {
  try {
    const encoded = encodeURIComponent(message)
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`
    await fetch(url)
  } catch (e) {
    console.error('WhatsApp send error:', e)
  }
}

// ── Format Nigerian phone for CallMeBot (08012345678 → 2348012345678) ──
function formatPhone(phone: string): string {
  if (!phone) return ''
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('0') && clean.length === 11) return '234' + clean.slice(1)
  if (clean.startsWith('234')) return clean
  return clean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Auth ──
    const secret = body.secret || req.headers.get('x-ea-secret')
    if (!secret || secret !== process.env.TRADING_EA_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const {
      batchCode, reportType, reportDate,
      accountBalance, accountEquity,
      totalTrades, totalProfit, totalLoss, netPnl,
      platform, trades,
    } = body

    if (!batchCode || !reportType || !reportDate) {
      return error('batchCode, reportType, and reportDate are required')
    }
    if (!['DAILY', 'WEEKLY'].includes(reportType)) {
      return error('reportType must be DAILY or WEEKLY')
    }

    // ── Find batch ──
    const batch = await prisma.$queryRaw<any[]>`
      SELECT id, "batchCode", name FROM batches
      WHERE "batchCode" = ${batchCode} LIMIT 1
    `
    if (!batch.length) return error(`Batch ${batchCode} not found`, 404)
    const batchId = batch[0].id
    const batchName = batch[0].name || batchCode

    // ── Upsert report ──
    const reportRows = await prisma.$queryRaw<any[]>`
      INSERT INTO trading_reports (
        "batchId", "batchCode", "reportType", "reportDate",
        "accountBalance", "accountEquity",
        "totalTrades", "totalProfit", "totalLoss", "netPnl",
        "platform", "createdAt"
      )
      VALUES (
        ${batchId}, ${batchCode}, ${reportType}, ${reportDate}::date,
        ${parseFloat(accountBalance) || 0},
        ${parseFloat(accountEquity) || 0},
        ${parseInt(totalTrades) || 0},
        ${parseFloat(totalProfit) || 0},
        ${parseFloat(totalLoss) || 0},
        ${parseFloat(netPnl) || 0},
        ${platform || 'MT4'},
        NOW()
      )
      ON CONFLICT ("batchId", "reportDate", "reportType")
      DO UPDATE SET
        "accountBalance" = EXCLUDED."accountBalance",
        "accountEquity"  = EXCLUDED."accountEquity",
        "totalTrades"    = EXCLUDED."totalTrades",
        "totalProfit"    = EXCLUDED."totalProfit",
        "totalLoss"      = EXCLUDED."totalLoss",
        "netPnl"         = EXCLUDED."netPnl",
        "platform"       = EXCLUDED."platform",
        "createdAt"      = NOW()
      RETURNING id
    `
    const reportId = reportRows[0]?.id

    // ── Insert trades ──
    if (reportId && Array.isArray(trades) && trades.length > 0) {
      await prisma.$executeRaw`DELETE FROM trading_trades WHERE "reportId" = ${reportId}`
      for (const t of trades) {
        await prisma.$executeRaw`
          INSERT INTO trading_trades (
            "reportId", "batchId", ticket, symbol,
            "tradeType", "openTime", "closeTime",
            "openPrice", "closePrice", lots,
            profit, commission, swap, comment
          ) VALUES (
            ${reportId}, ${batchId},
            ${String(t.ticket || '')}, ${String(t.symbol || '')},
            ${String(t.tradeType || t.type || 'BUY').toUpperCase()},
            ${t.openTime ? new Date(t.openTime) : null},
            ${t.closeTime ? new Date(t.closeTime) : null},
            ${parseFloat(t.openPrice) || 0}, ${parseFloat(t.closePrice) || 0},
            ${parseFloat(t.lots) || 0}, ${parseFloat(t.profit) || 0},
            ${parseFloat(t.commission) || 0}, ${parseFloat(t.swap) || 0},
            ${String(t.comment || '')}
          )
        `
      }
    }

    // ── Get all active investors in this batch ──
    const investors = await prisma.$queryRaw<any[]>`
      SELECT
        i.id, i."fullName", i.email,
        n."whatsappNumber", n."callmebotApiKey",
        n."notifyBatch", n."isVerified"
      FROM batch_members bm
      JOIN investors i ON i.id = bm."investorId"
      LEFT JOIN investor_notifications n ON n."investorId" = i.id
      WHERE bm."batchId" = ${batchId}
        AND bm.status IN ('ACTIVE', 'WITHDRAWAL_REQUESTED')
    `

    if (!investors.length) {
      return ok({ message: `${reportType} report saved for ${batchCode} (no investors to notify)`, reportId })
    }

    // ── Build notification content ──
    const netPnlNum = parseFloat(netPnl) || 0
    const isProfit = netPnlNum >= 0
    const pnlSign = isProfit ? '+' : ''
    const balanceNum = parseFloat(accountBalance) || 0
    const profitNum = parseFloat(totalProfit) || 0
    const lossNum = parseFloat(totalLoss) || 0
    const tradesNum = parseInt(totalTrades) || 0
    const isWeekly = reportType === 'WEEKLY'

    const reportLabel = isWeekly ? 'Weekly Trading Report' : 'Daily Trading Report'
    const dateFormatted = new Date(reportDate).toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })

    // WhatsApp message (keep concise)
    const whatsappMsg = [
      `📈 *${reportLabel} — ${batchCode}*`,
      `📅 ${dateFormatted}`,
      ``,
      `💰 Balance: $${balanceNum.toLocaleString()}`,
      `📊 Net P&L: ${pnlSign}$${Math.abs(netPnlNum).toLocaleString()}`,
      `🔢 Trades: ${tradesNum}`,
      profitNum > 0 ? `✅ Profit: +$${profitNum.toLocaleString()}` : '',
      lossNum > 0  ? `❌ Loss: -$${lossNum.toLocaleString()}` : '',
      ``,
      `Login to Club10 Pool to see full trade details.`,
    ].filter(Boolean).join('\n')

    // Email HTML
    const pnlColor = isProfit ? '#00d4aa' : '#ef4444'
    const tradesRows = Array.isArray(trades) && trades.length > 0
      ? trades.slice(0, 20).map((t: any) => {
          const tradePnl = (parseFloat(t.profit) || 0) + (parseFloat(t.commission) || 0) + (parseFloat(t.swap) || 0)
          const isWin = tradePnl >= 0
          return `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #1e2530;font-family:monospace;font-size:12px;color:#e2e8f0">${t.symbol || '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e2530;font-size:12px;color:${t.tradeType === 'BUY' ? '#00d4aa' : '#ef4444'};font-weight:700">${t.tradeType || '—'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e2530;font-size:12px;color:#94a3b8">${parseFloat(t.lots || 0).toFixed(2)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e2530;font-size:12px;color:${isWin ? '#00d4aa' : '#ef4444'};font-weight:700">${isWin ? '+' : ''}$${tradePnl.toFixed(2)}</td>
            </tr>`
        }).join('')
      : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#64748b;font-size:13px">No individual trades recorded</td></tr>`

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Courier New',monospace">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:32px;margin-bottom:8px">📈</div>
      <div style="font-size:20px;font-weight:800;color:#e2e8f0;margin-bottom:4px">${reportLabel}</div>
      <div style="font-size:13px;color:#64748b">${batchName} · ${dateFormatted}</div>
    </div>

    <!-- Key stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="background:#0d1117;border:1px solid #1e2530;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Account Balance</div>
        <div style="font-size:22px;font-weight:800;color:#00d4aa">$${balanceNum.toLocaleString()}</div>
      </div>
      <div style="background:#0d1117;border:1px solid ${pnlColor}44;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Net P&L</div>
        <div style="font-size:22px;font-weight:800;color:${pnlColor}">${pnlSign}$${Math.abs(netPnlNum).toLocaleString()}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="background:#0d1117;border:1px solid #1e2530;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Total Trades</div>
        <div style="font-size:18px;font-weight:800;color:#c9a84c">${tradesNum}</div>
      </div>
      <div style="background:#0d1117;border:1px solid rgba(0,212,170,0.2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Total Profit</div>
        <div style="font-size:18px;font-weight:800;color:#00d4aa">+$${profitNum.toLocaleString()}</div>
      </div>
      <div style="background:#0d1117;border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Total Loss</div>
        <div style="font-size:18px;font-weight:800;color:#ef4444">-$${lossNum.toLocaleString()}</div>
      </div>
    </div>

    <!-- Trades table -->
    ${tradesNum > 0 ? `
    <div style="background:#0d1117;border:1px solid #1e2530;border-radius:10px;overflow:hidden;margin-bottom:24px">
      <div style="padding:14px 16px;border-bottom:1px solid #1e2530">
        <div style="font-size:13px;font-weight:700;color:#e2e8f0">Individual Trades${trades?.length > 20 ? ` (showing 20 of ${trades.length})` : ''}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#080a0f">
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase">Symbol</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase">Type</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase">Lots</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;letter-spacing:1px;text-transform:uppercase">P&L</th>
          </tr>
        </thead>
        <tbody>${tradesRows}</tbody>
      </table>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/dashboard"
         style="display:inline-block;background:#00d4aa;color:#000;font-weight:800;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
        View Full Trading History →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#475569;border-top:1px solid #1e2530;padding-top:16px">
      Nova-Lite Club10 Pool · ${batchCode} · ${platform || 'MT4'}
    </div>
  </div>
</body>
</html>`

    // ── Send notifications to all investors ──
    const emailPromises = investors.map(async (inv: any) => {
      // Email — always send
      try {
        await mailer.sendMail({
          from: `"Club10 Pool" <${process.env.SMTP_USER}>`,
          to: inv.email,
          subject: `📈 ${reportLabel} — ${batchCode} (${pnlSign}$${Math.abs(netPnlNum).toLocaleString()})`,
          html: emailHtml,
        })
      } catch (e) {
        console.error(`Email failed for ${inv.email}:`, e)
      }

      // WhatsApp — only if verified + notifyBatch enabled
      if (inv.isVerified && inv.notifyBatch && inv.whatsappNumber && inv.callmebotApiKey) {
        const phone = formatPhone(inv.whatsappNumber)
        if (phone) {
          await sendWhatsApp(phone, inv.callmebotApiKey, whatsappMsg)
        }
      }
    })

    // Fire all notifications concurrently, don't block response
    Promise.allSettled(emailPromises).catch(() => {})

    return ok({
      message: `${reportType} report saved for ${batchCode}`,
      reportId,
      tradesCount: trades?.length || 0,
      notified: investors.length,
    })
  } catch (e: any) {
    console.error('Trading report error:', e)
    return error('Server error', 500)
  }
}
