import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { parseEntry } from '@/lib/parse-entry'
import { normalizeInbound } from '@/lib/whatsapp/inbound'
import { sendReply } from '@/lib/whatsapp/outbound'
import {
  detectCommand,
  handleCommand,
  detectSetBudget,
  detectMoveBudget,
  isRegisterIntent,
  registerInfoText,
} from '@/lib/whatsapp/commands'
import { emojiOf, matchCategory } from '@/lib/category'
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
      'id, nama, family_id, pending_tx_id, pending_at, families ( id, nama_keluarga, status_langganan, expired_at )',
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
    // Nomor tak terdaftar yang ingin mendaftar -> kirim info + link form.
    if (isRegisterIntent(inbound!.message)) {
      return respond(await registerInfoText(supabase))
    }
    // Hemat kuota: selain "daftar", secara default JANGAN balas nomor tak
    // terdaftar (bisa spam/salah sambung). Terima (200) tapi diam.
    if (process.env.REPLY_TO_UNREGISTERED === 'true') {
      return respond(
        'Nomor Anda belum terdaftar. Ketik *daftar* untuk berlangganan.',
      )
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
  // 4b) Menunggu jawaban kategori dari pertanyaan sebelumnya?
  // -----------------------------------------------------------
  if (user.pending_tx_id) {
    const answered = matchCategory(inbound!.message)
    const fresh =
      user.pending_at &&
      Date.now() - new Date(user.pending_at).getTime() < 60 * 60 * 1000
    if (answered && fresh) {
      await supabase
        .from('transactions')
        .update({ kategori: answered })
        .eq('id', user.pending_tx_id)
        .eq('family_id', family.id)
      await supabase
        .from('users')
        .update({ pending_tx_id: null, pending_at: null })
        .eq('id', user.id)
      return respond(`✅ Dikategorikan sebagai ${emojiOf(answered)} ${answered}.`)
    }
    // Bukan jawaban kategori / kadaluarsa -> bersihkan, lanjut proses biasa.
    await supabase
      .from('users')
      .update({ pending_tx_id: null, pending_at: null })
      .eq('id', user.id)
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
    const { data: prev } = await supabase
      .from('category_budgets')
      .select('nominal')
      .eq('family_id', family.id)
      .eq('kategori', budgetCmd.kategori)
      .maybeSingle()
    const { error } = await supabase.from('category_budgets').upsert(
      { family_id: family.id, kategori: budgetCmd.kategori, nominal: budgetCmd.nominal },
      { onConflict: 'family_id,kategori' },
    )
    if (error) {
      console.error('[webhook] set budget error:', error.message)
      return respond('Gagal menyimpan anggaran. Coba lagi sebentar.')
    }
    await supabase.from('budget_logs').insert({
      family_id: family.id,
      kategori: budgetCmd.kategori,
      aksi: 'set',
      nominal_lama: prev ? Number(prev.nominal) : null,
      nominal_baru: budgetCmd.nominal,
    })
    return respond(
      `✅ Anggaran *${budgetCmd.kategori}* diset ${rupiah(budgetCmd.nominal)}/bulan.`,
    )
  }

  // Pindah jatah antar amplop: "pindah makan transport 500rb"
  const moveCmd = detectMoveBudget(inbound!.message)
  if (moveCmd) {
    const { data: buds } = await supabase
      .from('category_budgets')
      .select('kategori, nominal')
      .eq('family_id', family.id)
      .in('kategori', [moveCmd.dari, moveCmd.ke])
    const cur: Record<string, number> = {}
    ;(buds ?? []).forEach((b) => (cur[b.kategori] = Number(b.nominal)))
    const dariLama = cur[moveCmd.dari] ?? 0
    const keLama = cur[moveCmd.ke] ?? 0
    const dariBaru = Math.max(0, dariLama - moveCmd.nominal)
    const keBaru = keLama + moveCmd.nominal

    const { error } = await supabase.from('category_budgets').upsert(
      [
        { family_id: family.id, kategori: moveCmd.dari, nominal: dariBaru },
        { family_id: family.id, kategori: moveCmd.ke, nominal: keBaru },
      ],
      { onConflict: 'family_id,kategori' },
    )
    if (error) {
      console.error('[webhook] move budget error:', error.message)
      return respond('Gagal memindahkan jatah. Coba lagi sebentar.')
    }
    await supabase.from('budget_logs').insert([
      { family_id: family.id, kategori: moveCmd.dari, aksi: 'pindah_keluar', nominal_lama: dariLama, nominal_baru: dariBaru },
      { family_id: family.id, kategori: moveCmd.ke, aksi: 'pindah_masuk', nominal_lama: keLama, nominal_baru: keBaru },
    ])
    return respond(
      `✅ Pindah ${rupiah(moveCmd.nominal)} dari *${moveCmd.dari}* ke *${moveCmd.ke}*.\n` +
        `${moveCmd.dari}: ${rupiah(dariBaru)} · ${moveCmd.ke}: ${rupiah(keBaru)}`,
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
  const { data: inserted, error: insErr } = await supabase
    .from('transactions')
    .insert({
      family_id: family.id,
      user_id: user.id,
      nama_pengeluaran: entry.nama,
      nominal: entry.nominal,
      tipe: entry.tipe,
      kategori: entry.kategori,
    })
    .select('id')
    .single()

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

  // Kategori tak terdeteksi (auto 'Lainnya', bukan override) -> tanya balik.
  if (kategori === 'Lainnya' && !entry.kategoriManual && inserted) {
    await supabase
      .from('users')
      .update({ pending_tx_id: inserted.id, pending_at: new Date().toISOString() })
      .eq('id', user.id)
    lines.push(
      '',
      '❓ Masuk kategori apa? Balas salah satu:',
      'Makan · Transport · Tagihan · Belanja',
      'Kesehatan · Hiburan · Anak · Tabungan',
      '(abaikan jika mau tetap di Lainnya)',
    )
    return respond(lines.join('\n'))
  }

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
  }

  return respond(lines.join('\n'))
}
