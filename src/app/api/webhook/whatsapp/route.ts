import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { parseEntry } from '@/lib/parse-entry'
import { normalizeInbound } from '@/lib/whatsapp/inbound'
import { sendReply } from '@/lib/whatsapp/outbound'
import { detectCommand, handleCommand, detectSetBudget } from '@/lib/whatsapp/commands'
import { emojiOf } from '@/lib/category'
import { wibMonthStartISO } from '@/lib/time'

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
  // 2) Baca payload — dukung JSON maupun form-data.
  //    Banyak gateway (Fonnte, Wablas) kirim application/x-www-form-urlencoded
  //    atau multipart/form-data, bukan JSON.
  // -----------------------------------------------------------
  let body: Record<string, unknown> = {}
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const form = await req.formData()
      body = Object.fromEntries(form.entries())
    }
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
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
    // Hemat kuota: secara default JANGAN balas nomor tak terdaftar (bisa
    // spam / salah sambung). Terima pesan (200) tapi diam. Set env
    // REPLY_TO_UNREGISTERED=true kalau ingin menyapa calon pelanggan.
    if (process.env.REPLY_TO_UNREGISTERED === 'true') {
      return respond('Nomor Anda belum terdaftar. Silakan hubungi admin untuk berlangganan.')
    }
    return NextResponse.json({ ok: true, ignored: 'unregistered' })
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
  // 5) Perintah bot (help/total/laporan/hari/hapus)? Tangani lebih dulu.
  // -----------------------------------------------------------
  const cmd = detectCommand(inbound!.message)
  if (cmd) {
    const text = await handleCommand(supabase, family, user, cmd)
    return respond(text)
  }

  // Set anggaran amplop per kategori: "anggaran makan 2jt"
  const budgetCmd = detectSetBudget(inbound!.message)
  if (budgetCmd) {
    const { error } = await supabase.from('category_budgets').upsert(
      { family_id: family.id, kategori: budgetCmd.kategori, nominal: budgetCmd.nominal },
      { onConflict: 'family_id,kategori' },
    )
    if (error) {
      console.error('[webhook] set budget error:', error.message)
      return respond('Gagal menyimpan anggaran. Coba lagi sebentar.')
    }
    return respond(
      `✅ Anggaran *${budgetCmd.kategori}* diset ${rupiah(budgetCmd.nominal)}/bulan.`,
    )
  }

  // -----------------------------------------------------------
  // 6) Kalau bukan perintah, catat sebagai pemasukan/pengeluaran.
  // -----------------------------------------------------------
  const entry = parseEntry(inbound!.message)
  if (!entry) {
    return respond(
      'Format tidak dikenali. Contoh:\n' +
        '• "Bensin 50000" (pengeluaran)\n' +
        '• "Makan siang 35rb"\n' +
        '• "masuk gaji 5000000" (pemasukan)\n\n' +
        'Ketik *bantuan* untuk menu.',
    )
  }

  // -----------------------------------------------------------
  // 7) Simpan transaksi. family_id & user_id DIKUNCI dari hasil
  //    lookup server-side — tidak pernah dari input client.
  //    Inilah inti isolasi multi-tenant di jalur tulis.
  // -----------------------------------------------------------
  const { error: insErr } = await supabase.from('transactions').insert({
    family_id: family.id,
    user_id: user.id,
    nama_pengeluaran: entry.nama,
    nominal: entry.nominal,
    tipe: entry.tipe,
    kategori: entry.kategori,
  })

  if (insErr) {
    console.error('[webhook] insert error:', insErr.message)
    return respond('Gagal menyimpan catatan. Coba lagi beberapa saat.')
  }

  // -----------------------------------------------------------
  // 8) Balasan sesuai tipe.
  // -----------------------------------------------------------
  if (entry.tipe === 'pemasukan') {
    return respond(
      `✅ Pemasukan tercatat untuk Keluarga *${family.nama_keluarga}*\n` +
        `📝 ${entry.nama}\n💵 ${rupiah(entry.nominal)}`,
    )
  }

  const kategori = entry.kategori ?? 'Lainnya'
  const lines = [
    `✅ Tercatat untuk Keluarga *${family.nama_keluarga}*`,
    `📝 ${entry.nama}`,
    `${emojiOf(kategori)} ${kategori} · ${rupiah(entry.nominal)}`,
  ]

  // Umpan balik amplop: kalau kategori ini punya anggaran, tampilkan sisanya;
  // kalau tidak, jatuh ke anggaran keseluruhan (jika di-set).
  const monthStart = wibMonthStartISO()
  const [{ data: budgetRow }, { data: catSpent }] = await Promise.all([
    supabase
      .from('category_budgets')
      .select('nominal')
      .eq('family_id', family.id)
      .eq('kategori', kategori)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('nominal')
      .eq('family_id', family.id)
      .eq('kategori', kategori)
      .eq('tipe', 'pengeluaran')
      .gte('created_at', monthStart),
  ])

  if (budgetRow) {
    const spent = (catSpent ?? []).reduce((s, r) => s + Number(r.nominal), 0)
    const sisa = Number(budgetRow.nominal) - spent
    lines.push(
      sisa >= 0
        ? `📊 Sisa amplop ${kategori}: ${rupiah(sisa)}`
        : `⚠️ Amplop ${kategori} lewat ${rupiah(-sisa)}`,
    )
  } else if (family.anggaran_bulanan != null) {
    const { data: spent } = await supabase.rpc('family_spent_this_month', {
      p_family_id: family.id,
    })
    const sisa = Number(family.anggaran_bulanan) - Number(spent ?? 0)
    lines.push(
      sisa >= 0
        ? `📊 Sisa anggaran bulan ini: ${rupiah(sisa)}`
        : `⚠️ Anggaran bulan ini terlampaui ${rupiah(-sisa)}`,
    )
  }

  return respond(lines.join('\n'))
}
