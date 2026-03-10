// src/app/api/broadcast/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, requireAdmin } from '@/lib/auth'
import { ok, error, unauthorized, forbidden } from '@/lib/api'

// GET — public (investors + admin): fetch active broadcasts
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()

  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, title, message, type, "createdAt", "expiresAt", "createdBy"
    FROM broadcast_notifications
    WHERE "isActive" = true
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    ORDER BY "createdAt" DESC
    LIMIT 10
  `
  return ok(rows)
}

// POST — admin only: create broadcast
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const { title, message, type, expiresInHours } = await req.json()
  if (!title || !message) return error('Title and message required')

  const validTypes = ['INFO', 'WARNING', 'SUCCESS', 'URGENT']
  const notifType = validTypes.includes(type) ? type : 'INFO'

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null

  const id = crypto.randomUUID()
  await prisma.$executeRaw`
    INSERT INTO broadcast_notifications (id, title, message, type, "isActive", "createdBy", "createdAt", "expiresAt")
    VALUES (${id}, ${title}, ${message}, ${notifType}, true, ${auth.email}, NOW(), ${expiresAt})
  `

  await prisma.auditLog.create({
    data: { actorId: auth.memberId, actorEmail: auth.email, action: 'BROADCAST_SENT', metadata: { title, type: notifType } },
  })

  return ok({ id, title, message, type: notifType })
}

// PATCH — admin only: deactivate a broadcast
export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  if (!requireAdmin(auth)) return forbidden()

  const { id } = await req.json()
  if (!id) return error('Broadcast ID required')

  await prisma.$executeRaw`
    UPDATE broadcast_notifications SET "isActive" = false WHERE id = ${id}
  `
  return ok({ deactivated: true })
}