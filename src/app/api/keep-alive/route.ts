import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Endpoint ringan untuk menjaga project Supabase tetap "hidup".
// Supabase free tier auto-pause setelah ~7 hari tanpa aktivitas; cron
// harian memanggil endpoint ini agar ada query rutin ke database.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Kalau CRON_SECRET di-set, wajib cocok (Vercel Cron otomatis mengirimnya
  // sebagai "Authorization: Bearer <CRON_SECRET>"). Kalau tidak di-set,
  // endpoint terbuka — aman karena hanya melakukan query hitung ringan.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { error, count } = await supabase
    .from('families')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('[keep-alive] error:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    families: count ?? 0,
    at: new Date().toISOString(),
  })
}
