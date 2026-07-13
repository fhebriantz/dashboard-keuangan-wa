import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'admin_session'

/**
 * Token sesi = HMAC(password, "dashboard-admin"). Disimpan di cookie httpOnly.
 * Tanpa tahu ADMIN_PASSWORD, token tidak bisa dipalsukan.
 */
function sessionToken(): string {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) throw new Error('ADMIN_PASSWORD belum di-set di environment.')
  return crypto.createHmac('sha256', pw).update('dashboard-admin').digest('hex')
}

export function hasAdminPassword(): boolean {
  return !!process.env.ADMIN_PASSWORD
}

export function verifyPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD
  return !!pw && input.length > 0 && input === pw
}

export async function isAuthed(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value
  if (!value) return false
  try {
    const a = Buffer.from(value)
    const b = Buffer.from(sessionToken())
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function setSession(): Promise<void> {
  ;(await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // http lokal tetap bisa
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  })
}

export async function clearSession(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
