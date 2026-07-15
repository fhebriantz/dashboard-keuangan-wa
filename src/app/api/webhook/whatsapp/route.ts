import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { parseEntry, parseBulk, type ParsedEntry } from '@/lib/parse-entry'
import { aiInterpret } from '@/lib/ai/interpret'
import { aiReadReceipt } from '@/lib/ai/receipt'
import { aiEnabled } from '@/lib/ai/gemini'
import {
  applySetBudget,
  applyMoveBudget,
  applyDeleteBudget,
} from '@/lib/budget-actions'
import { normalizeInbound } from '@/lib/whatsapp/inbound'
import { sendReply } from '@/lib/whatsapp/outbound'
import {
  detectCommand,
  handleCommand,
  detectSetBudget,
  detectMoveBudget,
  detectDeleteBudget,
  isUploadIntent,
  isRegisterIntent,
  registerInfoText,
} from '@/lib/whatsapp/commands'
import { emojiOf, asCategory } from '@/lib/category'
import { lookupCategoryMemory, learnCategoryMemory } from '@/lib/category-memory'
import { detectIuran, handleIuran } from '@/lib/iuran-actions'
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
      'id, nama, family_id, pending_tx_id, pending_at, families ( id, nama_keluarga, status_langganan, expired_at, mode, iuran_nominal, public_slug, laporan_publik )',
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
  // 4a) Idempotensi: klaim pesan ini (sender+timestamp+isi). Kalau kunci
  //     sama datang lagi (retry gateway) -> abaikan, jangan proses ulang.
  // -----------------------------------------------------------
  const ts = body.timestamp
  if (ts != null && String(ts).length > 0) {
    const eventKey = crypto
      .createHash('sha256')
      .update(`${sender}|${ts}|${inbound!.message}|${inbound!.imageUrl ?? ''}`)
      .digest('hex')
    const { error: dupErr } = await supabase.from('webhook_events').insert({ event_key: eventKey })
    if (dupErr) {
      if (dupErr.code === '23505') {
        // Sudah pernah diproses -> jangan balas/simpan lagi.
        return NextResponse.json({ ok: true, deduped: true })
      }
      console.error('[webhook] dedup insert error:', dupErr.message) // lanjut proses
    }
  }

  // -----------------------------------------------------------
  // 4b) Menunggu jawaban kategori dari pertanyaan sebelumnya?
  // -----------------------------------------------------------
  if (user.pending_tx_id) {
    const msg = inbound!.message
    const fresh =
      user.pending_at &&
      Date.now() - new Date(user.pending_at).getTime() < 60 * 60 * 1000
    // Kalau pesan ini sebenarnya aksi baru (perintah / transaksi), jangan
    // anggap sebagai jawaban kategori — batalkan pending, proses seperti biasa.
    const aksiBaru =
      !!detectCommand(msg) || !!detectSetBudget(msg) || !!detectMoveBudget(msg) || !!parseEntry(msg)

    if (fresh && !aksiBaru) {
      const cat = asCategory(msg)
      if (cat) {
        const { data: tx } = await supabase
          .from('transactions')
          .update({ kategori: cat })
          .eq('id', user.pending_tx_id)
          .eq('family_id', family.id)
          .select('nama_pengeluaran')
          .maybeSingle()
        await supabase
          .from('users')
          .update({ pending_tx_id: null, pending_at: null })
          .eq('id', user.id)
        if (tx?.nama_pengeluaran)
          await learnCategoryMemory(supabase, family.id, tx.nama_pengeluaran, cat)
        return respond(`✅ Dikategorikan sebagai ${emojiOf(cat)} ${cat}.`)
      }
      // Belum dikenal sebagai kategori & bukan aksi baru -> tanya ulang.
      return respond(
        '❓ Kategori belum dikenal. Balas nama kategori, mis. *Makan*, *Transport*, atau *Olahraga*.\n(abaikan jika mau tetap di Lainnya)',
      )
    }
    // Aksi baru atau kadaluarsa -> bersihkan pending, lanjut proses biasa.
    await supabase
      .from('users')
      .update({ pending_tx_id: null, pending_at: null })
      .eq('id', user.id)
  }

  // -----------------------------------------------------------
  // 4b2) Minta upload struk -> kirim link (gambar tak disimpan).
  // -----------------------------------------------------------
  if (isUploadIntent(inbound!.message)) {
    const base = process.env.APP_URL?.replace(/\/$/, '')
    if (!base) return respond('Fitur upload struk belum siap. Ketik manual saja, mis. "Belanja 150000".')
    return respond(
      '📷 Upload struk di sini (buka di HP, bisa langsung foto):\n' +
        `${base}/struk/${family.id}\n\n` +
        'Fotonya *tidak disimpan* — hanya dibaca lalu dicatat.',
    )
  }

  // -----------------------------------------------------------
  // 4c) Banyak transaksi sekaligus (satu per baris)? Catat massal.
  // -----------------------------------------------------------
  const bulk = parseBulk(inbound!.message)
  if (bulk) return recordBulk(bulk)

  // -----------------------------------------------------------
  // 5) Perintah bot (help/total/laporan/hari/hapus)? Tangani lebih dulu.
  // -----------------------------------------------------------
  const cmd = detectCommand(inbound!.message)
  if (cmd) {
    const text = await handleCommand(supabase, family, user, cmd)
    return respond(text)
  }

  // Set anggaran amplop: "anggaran makan 2jt"
  const budgetCmd = detectSetBudget(inbound!.message)
  if (budgetCmd) {
    return respond(await applySetBudget(supabase, family.id, budgetCmd.kategori, budgetCmd.nominal))
  }

  // Pindah jatah antar amplop: "pindah makan transport 500rb"
  const moveCmd = detectMoveBudget(inbound!.message)
  if (moveCmd) {
    return respond(await applyMoveBudget(supabase, family.id, moveCmd.dari, moveCmd.ke, moveCmd.nominal))
  }

  // Hapus amplop: "hapus amplop makan"
  const delCmd = detectDeleteBudget(inbound!.message)
  if (delCmd) {
    return respond(await applyDeleteBudget(supabase, family.id, delCmd.kategori))
  }

  // -----------------------------------------------------------
  // 5b) Perintah kas komunitas (iuran) — hanya untuk mode 'komunitas'.
  //     Ditaruh sebelum pencatatan transaksi agar "budi bayar" /
  //     "iuran budi 50rb" tidak salah dianggap pengeluaran.
  // -----------------------------------------------------------
  if (family.mode === 'komunitas') {
    const iuranCmd = detectIuran(inbound!.message)
    if (iuranCmd) {
      return respond(await handleIuran(supabase, family, user.id, iuranCmd))
    }
  }

  // -----------------------------------------------------------
  // 6) Foto struk (kalau ada) -> AI vision baca total. Hanya saat ada gambar.
  // -----------------------------------------------------------
  // Fonnte FREE mengirim media sebagai "non-text message" TANPA url gambar.
  const mediaPlaceholder = /^non-(text|button) message$/i.test(inbound!.message.trim())
  if (inbound!.imageUrl || mediaPlaceholder) {
    if (inbound!.imageUrl && aiEnabled()) {
      const rEntry = await aiReadReceipt(inbound!.imageUrl)
      if (rEntry) return recordAndRespond(rEntry)
      return respond('📷 Struk tak terbaca (foto kurang jelas / bukan struk). Ketik manual ya, mis. "Belanja 150000".')
    }
    if (inbound!.imageUrl && !aiEnabled()) {
      return respond('📷 Fitur baca struk belum aktif. Ketik manual ya, mis. "Belanja 150000".')
    }
    // Tak ada URL gambar -> gateway tak meneruskan media. Arahkan ke upload web.
    const base = process.env.APP_URL?.replace(/\/$/, '')
    return respond(
      base
        ? `📷 Untuk catat dari struk, buka & foto di sini:\n${base}/struk/${family.id}\n\n(Fotonya tidak disimpan.) Atau ketik manual, mis. "Belanja 150000".`
        : '📷 Kirim foto belum didukung. Ketik manual saja, mis. "Belanja 150000".',
    )
  }

  // -----------------------------------------------------------
  // 7) Catat transaksi. Rule-based dulu (gratis). Kalau gagal, AI paham maksud
  //    (transaksi ATAU perintah) — sekali panggil. Kalau AI mati/limit -> null.
  // -----------------------------------------------------------
  const ruleEntry = parseEntry(inbound!.message)
  if (ruleEntry) return recordAndRespond(ruleEntry)

  const ai = await aiInterpret(inbound!.message)
  if (ai) {
    switch (ai.action) {
      case 'catat':
        return recordAndRespond(ai.entry)
      case 'set_amplop':
        return respond(await applySetBudget(supabase, family.id, ai.kategori, ai.nominal))
      case 'pindah_amplop':
        return respond(await applyMoveBudget(supabase, family.id, ai.dari, ai.ke, ai.nominal))
      case 'hapus_amplop':
        return respond(await applyDeleteBudget(supabase, family.id, ai.kategori))
      case 'total':
      case 'laporan':
      case 'hari':
      case 'hapus':
      case 'bantuan': {
        const map = { total: 'total', laporan: 'laporan', hari: 'today', hapus: 'hapus', bantuan: 'help' } as const
        return respond(await handleCommand(supabase, family, user, map[ai.action]))
      }
    }
  }

  return respond(
    'Format tidak dikenali. Contoh:\n' +
      '• "Bensin 50000" (pengeluaran)\n' +
      '• "Makan siang 35rb"\n' +
      '• "masuk gaji 5000000" (pemasukan)\n\n' +
      'Ketik *bantuan* untuk menu.',
  )

  // --- pencatatan transaksi (dipakai rule-based, AI, & struk) ---
  async function recordAndRespond(entry: ParsedEntry) {
    const fam = family!
    const usr = user!
    let kategori: string | null =
      entry.tipe === 'pemasukan' ? null : entry.kategori ?? 'Lainnya'
    if (entry.tipe === 'pengeluaran' && kategori === 'Lainnya' && !entry.kategoriManual) {
      const remembered = await lookupCategoryMemory(supabase, fam.id, entry.nama)
      if (remembered) kategori = remembered
    }

    const { data: inserted, error: insErr } = await supabase
      .from('transactions')
      .insert({
        family_id: fam.id,
        user_id: usr.id,
        nama_pengeluaran: entry.nama,
        nominal: entry.nominal,
        tipe: entry.tipe,
        kategori,
      })
      .select('id')
      .single()
    if (insErr) {
      console.error('[webhook] insert error:', insErr.message)
      return respond('Gagal menyimpan catatan. Coba lagi beberapa saat.')
    }

    if (entry.tipe === 'pengeluaran' && entry.kategoriManual && entry.kategori) {
      await learnCategoryMemory(supabase, fam.id, entry.nama, entry.kategori)
    }

    if (entry.tipe === 'pemasukan') {
      return respond(
        `✅ Pemasukan tercatat untuk Keluarga *${fam.nama_keluarga}*\n` +
          `📝 ${entry.nama}\n💵 ${rupiah(entry.nominal)}`,
      )
    }

    const kat = kategori ?? 'Lainnya'
    const lines = [
      `✅ Tercatat untuk Keluarga *${fam.nama_keluarga}*`,
      `📝 ${entry.nama}`,
      `${emojiOf(kat)} ${kat} · ${rupiah(entry.nominal)}`,
    ]

    if (kat === 'Lainnya' && !entry.kategoriManual && inserted) {
      await supabase
        .from('users')
        .update({ pending_tx_id: inserted.id, pending_at: new Date().toISOString() })
        .eq('id', usr.id)
      lines.push(
        '',
        '❓ Masuk kategori apa? Balas salah satu:',
        'Makan · Transport · Tagihan · Belanja',
        'Kesehatan · Hiburan · Anak · Tabungan',
        '(abaikan jika mau tetap di Lainnya)',
      )
      return respond(lines.join('\n'))
    }

    const monthStart = wibMonthStartISO()
    const [{ data: budgetRow }, { data: catSpent }] = await Promise.all([
      supabase.from('category_budgets').select('nominal').eq('family_id', fam.id).eq('kategori', kat).maybeSingle(),
      supabase
        .from('transactions')
        .select('nominal')
        .eq('family_id', fam.id)
        .eq('kategori', kat)
        .eq('tipe', 'pengeluaran')
        .gte('created_at', monthStart),
    ])

    if (budgetRow) {
      const spent = (catSpent ?? []).reduce((s, r) => s + Number(r.nominal), 0)
      const sisa = Number(budgetRow.nominal) - spent
      lines.push(
        sisa >= 0 ? `📊 Sisa amplop ${kat}: ${rupiah(sisa)}` : `⚠️ Amplop ${kat} lewat ${rupiah(-sisa)}`,
      )
    } else if (kat !== 'Lainnya') {
      lines.push(`ℹ️ Belum ada amplop ${kat} — set: amplop ${kat.toLowerCase()} <nominal>`)
    }

    return respond(lines.join('\n'))
  } // akhir recordAndRespond

  // --- pencatatan massal (banyak baris) ---
  async function recordBulk(bulk: { entries: ParsedEntry[]; failed: string[] }) {
    const fam = family!
    const usr = user!
    const rows: Record<string, unknown>[] = []
    const display: { tipe: string; nama: string; nominal: number; kategori: string | null }[] = []

    for (const e of bulk.entries) {
      let kategori: string | null = e.tipe === 'pemasukan' ? null : e.kategori ?? 'Lainnya'
      if (e.tipe === 'pengeluaran' && kategori === 'Lainnya' && !e.kategoriManual) {
        const remembered = await lookupCategoryMemory(supabase, fam.id, e.nama)
        if (remembered) kategori = remembered
      }
      rows.push({
        family_id: fam.id,
        user_id: usr.id,
        nama_pengeluaran: e.nama,
        nominal: e.nominal,
        tipe: e.tipe,
        kategori,
      })
      display.push({ tipe: e.tipe, nama: e.nama, nominal: e.nominal, kategori })
      if (e.tipe === 'pengeluaran' && e.kategoriManual && e.kategori) {
        await learnCategoryMemory(supabase, fam.id, e.nama, e.kategori)
      }
    }

    const { error } = await supabase.from('transactions').insert(rows)
    if (error) {
      console.error('[webhook] bulk insert error:', error.message)
      return respond('Gagal menyimpan catatan massal. Coba lagi sebentar.')
    }

    const totalOut = display.filter((d) => d.tipe === 'pengeluaran').reduce((s, d) => s + d.nominal, 0)
    const totalIn = display.filter((d) => d.tipe === 'pemasukan').reduce((s, d) => s + d.nominal, 0)
    const lines = [`✅ ${rows.length} transaksi tercatat untuk *${fam.nama_keluarga}*:`]
    for (const d of display) {
      const ic = d.tipe === 'pemasukan' ? '💵' : emojiOf(d.kategori ?? 'Lainnya')
      lines.push(`${ic} ${d.nama} · ${rupiah(d.nominal)}`)
    }
    lines.push('')
    if (totalOut > 0) lines.push(`💰 Pengeluaran: ${rupiah(totalOut)}`)
    if (totalIn > 0) lines.push(`💵 Pemasukan: ${rupiah(totalIn)}`)
    if (bulk.failed.length) {
      lines.push('', `⚠️ ${bulk.failed.length} baris tak terbaca: ${bulk.failed.join(', ')}`)
    }
    return respond(lines.join('\n'))
  } // akhir recordBulk
}
