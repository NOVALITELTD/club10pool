// src/lib/api.ts
import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function unauthorized() {
  return error('Unauthorized', 401)
}

export function forbidden() {
  return error('Forbidden — admin access required', 403)
}

export function notFound(entity = 'Resource') {
  return error(`${entity} not found`, 404)
}
