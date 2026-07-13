import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { parseTransactionMessage } from '@/lib/parse-transaction'
import { normalizeInbound } from '@/lib/whatsapp/inbound'
import { sendReply } from '@/lib/whatsapp/outbound'

// service_role + supabase-js butuh runtime Node (bukan Edge murni).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

export async function POST(req: NextRequest) {
  // -----------------------------------------------------------
  // 1) Autentikasi gateway (shared secret) — cegah orang lain
  //    memalsukan transaksi ke endpoint publik ini.
  //    Terima dari header "x-webhook-secret" ATAU query "?secret="
  //    (banyak gateway awam hanya bisa set URL, tak bisa custom header).
  // -----------------------------------------------------------
  const secret =
    req.headers.get('x-webhook-secret') ??
    req.nextUrl.searchParams.get('secret')
  if (!process.env.WA_WEBHOOK_SECRET || secret !== process.env.WA_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // -----------------------------------------------------------
  // 2) Normalisasi payload (seragam antar-gateway).
  // -----------------------------------------------------------
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const inbound = normalizeInbound(body)
  const sender = normalizePhone(inbound?.sender ?? '')
  if (!sender) {
    return NextResponse.json({ error: 'sender tidak valid' }, { status: 400 })
  }

  // Balas via seam outbound: mode 'response' -> teks di HTTP response,
  // mode 'cloud' -> kirim aktif ke Graph API. Route tidak perlu tahu mana.
  const respond = async (text: string) => {
    const r = await sendReply(sender, text)
    return NextResponse.json(r.inlineReply != null ? { reply: r.inlineReply } : { ok: true })
  }

  const supabase = createAdminClient()

  // -----------------------------------------------------------
  // 3) Lookup user + data keluarga dalam satu query (aman dari
  //    SQL injection: nilai di-bind lewat query builder).
  // -----------------------------------------------------------
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select(
      'id, nama, family_id, families ( id, nama_keluarga, status_langganan, expired_at, anggaran_bulanan )',
    )
    .eq('nomor_wa', sender)
    .maybeSingle()

  if (userErr) {
    console.error('[webhook] user lookup error:', userErr.message)
    return respond('Terjadi kesalahan sistem. Coba lagi beberapa saat.')
  }

  const family = user
    ? Array.isArray(user.families)
      ? user.families[0]
      : user.families
    : null

  if (!user || !family) {
    return respond('Nomor Anda belum terdaftar. Silakan hubungi admin untuk berlangganan.')
  }

  // -----------------------------------------------------------
  // 4) Cek status langganan (status + tanggal expired).
  // -----------------------------------------------------------
  const isActive =
    family.status_langganan === 'active' &&
    (!family.expired_at || new Date(family.expired_at) > new Date())

  if (!isActive) {
    return respond('Masa langganan Anda telah habis. Silakan perpanjang di dashboard.')
  }

  // -----------------------------------------------------------
  // 5) Parse pesan.
  // -----------------------------------------------------------
  const parsed = parseTransactionMessage(inbound!.message)
  if (!parsed) {
    return respond(
      'Format tidak dikenali. Contoh:\n' +
        '• "Bensin 50000"\n' +
        '• "Makan siang 35rb"\n' +
        '• "Token listrik Rp. 100.000"',
    )
  }

  // -----------------------------------------------------------
  // 6) Simpan transaksi. family_id & user_id DIKUNCI dari hasil
  //    lookup server-side — tidak pernah dari input client.
  //    Inilah inti isolasi multi-tenant di jalur tulis.
  // -----------------------------------------------------------
  const { error: insErr } = await supabase.from('transactions').insert({
    family_id: family.id,
    user_id: user.id,
    nama_pengeluaran: parsed.nama,
    nominal: parsed.nominal,
  })

  if (insErr) {
    console.error('[webhook] insert error:', insErr.message)
    return respond('Gagal menyimpan catatan. Coba lagi beberapa saat.')
  }

  // -----------------------------------------------------------
  // 7) Balasan ramah + estimasi sisa anggaran bulan ini.
  // -----------------------------------------------------------
  const lines = [
    `✅ Tercatat untuk Keluarga *${family.nama_keluarga}*`,
    `📝 ${parsed.nama}`,
    `💰 ${rupiah(parsed.nominal)}`,
  ]

  if (family.anggaran_bulanan != null) {
    const { data: spent } = await supabase.rpc('family_spent_this_month', {
      p_family_id: family.id,
    })
    const totalSpent = Number(spent ?? 0)
    const sisa = Number(family.anggaran_bulanan) - totalSpent
    lines.push(
      sisa >= 0
        ? `📊 Sisa anggaran bulan ini: ${rupiah(sisa)}`
        : `⚠️ Anggaran bulan ini terlampaui ${rupiah(Math.abs(sisa))}`,
    )
  }

  return respond(lines.join('\n'))
}
