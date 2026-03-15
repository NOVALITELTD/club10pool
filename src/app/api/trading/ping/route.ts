// src/app/api/trading/ping/route.ts
// EA calls this on startup to confirm connection — admin can see last ping time
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, error } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const secret = body.secret || req.headers.get('x-ea-secret')
    if (!secret || secret !== process.env.TRADING_EA_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { batchCode, platform, accountId, balance, equity } = body
    if (!batchCode) return error('batchCode is required')

    // Upsert ping record
    await prisma.$executeRaw`
      INSERT INTO trading_ea_status (
        "batchCode", platform, "accountId",
        balance, equity, "lastPingAt", "createdAt"
      )
      VALUES (
        ${batchCode}, ${platform || 'MT4'}, ${accountId || ''},
        ${parseFloat(balance) || 0}, ${parseFloat(equity) || 0},
        NOW(), NOW()
      )
      ON CONFLICT ("batchCode")
      DO UPDATE SET
        platform     = EXCLUDED.platform,
        "accountId"  = EXCLUDED."accountId",
        balance      = EXCLUDED.balance,
        equity       = EXCLUDED.equity,
        "lastPingAt" = NOW()
    `

    return ok({ message: 'Ping received', batchCode, serverTime: new Date().toISOString() })
  } catch (e: any) {
    console.error('Ping error:', e)
    return error('Server error', 500)
  }
}

// Admin GET — see all EA statuses
export async function GET(req: NextRequest) {
  try {
    const statuses = await prisma.$queryRaw<any[]>`
      SELECT
        s."batchCode", s.platform, s."accountId",
        s.balance, s.equity, s."lastPingAt",
        b.name AS "batchName",
        b.status AS "batchStatus",
        -- Online = pinged within last 2 hours
        (NOW() - s."lastPingAt") < INTERVAL '2 hours' AS "isOnline",
        -- Minutes since last ping
        EXTRACT(EPOCH FROM (NOW() - s."lastPingAt")) / 60 AS "minutesSincePing"
      FROM trading_ea_status s
      LEFT JOIN batches b ON b."batchCode" = s."batchCode"
      ORDER BY s."lastPingAt" DESC
    `
    return ok(statuses)
  } catch (e: any) {
    return error('Server error', 500)
  }
}