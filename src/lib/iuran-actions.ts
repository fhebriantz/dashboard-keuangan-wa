import type { SupabaseClient } from '@supabase/supabase-js'
import { parseTransactionMessage } from '@/lib/parse-transaction'
import { normalizePhone } from '@/lib/phone'
import { wibPeriode, namaPeriode } from '@/lib/time'
import { makeSlug } from '@/lib/slug'

// Kas Komunitas (Fase B) — perintah iuran via WhatsApp untuk bendahara.
// Hanya aktif saat family.mode === 'komunitas' (di-gate di webhook route).

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

export type IuranAction =
  | { kind: 'bayar'; nama: string; nominal: number | null }
  | { kind: 'tambah_anggota'; nama: string; wa: string | null }
  | { kind: 'belum_bayar' }
  | { kind: 'sudah_bayar' }
  | { kind: 'daftar_anggota' }
  | { kind: 'set_iuran'; nominal: number }
  | { kind: 'set_tempo'; tanggal: number }
  | { kind: 'link' }

/**
 * Deteksi perintah kas komunitas. Dipanggil HANYA dalam mode komunitas, jadi
 * boleh agak longgar. Urutan penting: query/exact match lebih dulu, baru "bayar".
 */
export function detectIuran(message: string): IuranAction | null {
  const t = (message ?? '').trim()
  const low = t.toLowerCase()

  // Query status (exact) — cek sebelum pola "<nama> bayar".
  if (/^(belum bayar|yang belum bayar|blm bayar|belum iuran)$/.test(low)) return { kind: 'belum_bayar' }
  if (/^(sudah bayar|yang sudah bayar|udah bayar|sudah iuran)$/.test(low)) return { kind: 'sudah_bayar' }
  if (/^(daftar anggota|list anggota|anggota|warga)$/.test(low)) return { kind: 'daftar_anggota' }
  if (/^(link laporan|link|link kas|bagikan laporan)$/.test(low)) return { kind: 'link' }

  // Set tanggal jatuh tempo: "jatuh tempo 5" / "tempo tanggal 5".
  const tempoM = low.match(/^(?:jatuh\s*tempo|tempo)(?:\s+tanggal)?\s+(\d{1,2})$/)
  if (tempoM) {
    const tgl = parseInt(tempoM[1], 10)
    if (tgl >= 1 && tgl <= 28) return { kind: 'set_tempo', tanggal: tgl }
  }

  // Set nominal iuran default: "iuran bulanan 50rb" / "set iuran 50rb".
  const setM = low.match(/^(?:set\s+)?iuran\s+(?:bulanan|per bulan|default)\s+(.+)$/)
  if (setM) {
    const p = parseTransactionMessage('x ' + setM[1])
    if (p) return { kind: 'set_iuran', nominal: p.nominal }
  }

  // Tambah anggota: "tambah anggota Budi 0812xxx" (nomor opsional).
  const addM = t.match(/^(?:tambah|tambahkan|add|daftar)\s+(?:anggota|warga)\s+(.+)$/i)
  if (addM) {
    const { nama, wa } = pisahNamaNomor(addM[1])
    if (nama) return { kind: 'tambah_anggota', nama, wa }
  }

  // Bayar bentuk 1: "iuran Budi 50rb" / "iuran Budi".
  const iuranM = t.match(/^iuran\s+(.+)$/i)
  if (iuranM) return bayarDariSisa(iuranM[1])

  // Bayar bentuk 2: "bayar iuran Budi 50rb". Sengaja WAJIB kata "iuran" agar
  // pengeluaran umum ("bayar listrik 100rb") tidak salah dianggap iuran.
  const bayarM = t.match(/^bayar\s+iuran\s+(.+)$/i)
  if (bayarM) return bayarDariSisa(bayarM[1])

  // Bayar bentuk 3: "Budi bayar" / "Budi sudah bayar" / "Budi lunas".
  const suffixM = t.match(/^(.+?)\s+(?:sudah\s+)?(?:bayar|lunas)(?:\s+iuran)?$/i)
  if (suffixM) {
    const nama = suffixM[1].trim()
    if (nama) return { kind: 'bayar', nama, nominal: null }
  }

  return null
}

function bayarDariSisa(sisa: string): IuranAction {
  const parsed = parseTransactionMessage(sisa)
  if (parsed && parsed.nominal > 0) {
    return { kind: 'bayar', nama: parsed.nama.trim(), nominal: parsed.nominal }
  }
  return { kind: 'bayar', nama: sisa.trim(), nominal: null }
}

/** Pisahkan "Budi 0812xxx" -> { nama:'Budi', wa:'628...' }. Nomor opsional di akhir. */
function pisahNamaNomor(s: string): { nama: string; wa: string | null } {
  const m = s.trim().match(/^(.*?)[\s,]+([0-9+][0-9\s-]{6,})$/)
  if (m) {
    const wa = normalizePhone(m[2])
    return { nama: m[1].trim(), wa: wa || null }
  }
  return { nama: s.trim(), wa: null }
}

type Anggota = { id: string; nama: string; nomor_wa: string | null; nominal_default: number | null }

/** Cocokkan nama ke roster: exact -> contains -> null jika ambigu/none. */
function cariAnggota(roster: Anggota[], nama: string): Anggota | 'ambigu' | null {
  const q = nama.trim().toLowerCase()
  if (!q) return null
  const exact = roster.filter((a) => a.nama.toLowerCase() === q)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return 'ambigu'
  const partial = roster.filter(
    (a) => a.nama.toLowerCase().includes(q) || q.includes(a.nama.toLowerCase()),
  )
  if (partial.length === 1) return partial[0]
  if (partial.length > 1) return 'ambigu'
  return null
}

type Family = {
  id: string
  iuran_nominal: number | null
  public_slug?: string | null
  laporan_publik?: boolean | null
}

export async function handleIuran(
  supabase: SupabaseClient,
  family: Family,
  userId: string,
  action: IuranAction,
): Promise<string> {
  switch (action.kind) {
    case 'link': {
      const base = process.env.APP_URL?.replace(/\/$/, '')
      if (!base) return 'Link laporan belum tersedia (APP_URL belum diset admin).'
      let slug = family.public_slug
      if (!slug) {
        slug = makeSlug(family.id)
        const { error } = await supabase.from('families').update({ public_slug: slug }).eq('id', family.id)
        if (error) return 'Gagal menyiapkan link laporan. Coba lagi sebentar.'
      }
      const status = family.laporan_publik === false ? '\n\n⚠️ Laporan sedang ditutup — buka lagi dari admin.' : ''
      return `🔗 Link laporan kas (bisa dibuka semua warga, tanpa login):\n${base}/kas/${slug}${status}`
    }

    case 'set_iuran': {
      const { error } = await supabase
        .from('families')
        .update({ iuran_nominal: action.nominal })
        .eq('id', family.id)
      if (error) return 'Gagal menyetel iuran. Coba lagi sebentar.'
      return `✅ Iuran default diset ${rupiah(action.nominal)}/periode.\nCatat bayar: *nama bayar* atau *iuran nama*.`
    }

    case 'set_tempo': {
      const { error } = await supabase
        .from('families')
        .update({ iuran_jatuh_tempo: action.tanggal })
        .eq('id', family.id)
      if (error) return 'Gagal menyetel jatuh tempo. Coba lagi sebentar.'
      return `✅ Jatuh tempo iuran diset tanggal *${action.tanggal}* tiap bulan.\nWarga yang belum bayar akan diingatkan otomatis via WA.`
    }

    case 'tambah_anggota': {
      const { error } = await supabase.from('iuran_anggota').insert({
        family_id: family.id,
        nama: action.nama,
        nomor_wa: action.wa,
      })
      if (error) return 'Gagal menambah anggota. Coba lagi sebentar.'
      const extra = action.wa ? ` (${action.wa})` : ''
      return `✅ Anggota *${action.nama}*${extra} ditambahkan ke roster.`
    }

    case 'daftar_anggota': {
      const { data } = await supabase
        .from('iuran_anggota')
        .select('nama, nomor_wa')
        .eq('family_id', family.id)
        .eq('aktif', true)
        .order('nama')
      const rows = data ?? []
      if (rows.length === 0)
        return '👥 Belum ada anggota. Tambah: *tambah anggota Budi 0812xxx* (nomor opsional).'
      const list = rows.map((r, i) => `${i + 1}. ${r.nama}${r.nomor_wa ? ` — ${r.nomor_wa}` : ''}`)
      return `👥 *Anggota (${rows.length}):*\n` + list.join('\n')
    }

    case 'belum_bayar':
    case 'sudah_bayar': {
      const periode = wibPeriode()
      const [{ data: roster }, { data: bayar }] = await Promise.all([
        supabase.from('iuran_anggota').select('id, nama').eq('family_id', family.id).eq('aktif', true).order('nama'),
        supabase.from('iuran_pembayaran').select('anggota_id, created_at').eq('family_id', family.id).eq('periode', periode),
      ])
      const paidMap = new Map((bayar ?? []).map((b) => [b.anggota_id as string, b.created_at as string]))
      const all = roster ?? []
      if (all.length === 0) return '👥 Belum ada anggota di roster.'

      if (action.kind === 'belum_bayar') {
        const belum = all.filter((a) => !paidMap.has(a.id))
        if (belum.length === 0) return `🎉 Semua sudah bayar iuran ${namaPeriode(periode)}!`
        return (
          `⏳ *Belum bayar ${namaPeriode(periode)}* (${belum.length}/${all.length}):\n` +
          belum.map((a, i) => `${i + 1}. ${a.nama}`).join('\n')
        )
      }
      const sudah = all.filter((a) => paidMap.has(a.id))
      if (sudah.length === 0) return `Belum ada yang bayar iuran ${namaPeriode(periode)}.`
      return (
        `✅ *Sudah bayar ${namaPeriode(periode)}* (${sudah.length}/${all.length}):\n` +
        sudah.map((a, i) => `${i + 1}. ${a.nama}`).join('\n')
      )
    }

    case 'bayar': {
      const { data: roster } = await supabase
        .from('iuran_anggota')
        .select('id, nama, nomor_wa, nominal_default')
        .eq('family_id', family.id)
        .eq('aktif', true)
      const found = cariAnggota((roster ?? []) as Anggota[], action.nama)
      if (found === null)
        return `❓ Anggota "${action.nama}" tak ditemukan. Tambah dulu: *tambah anggota ${action.nama}*.`
      if (found === 'ambigu')
        return `❓ Ada beberapa anggota mirip "${action.nama}". Ketik nama lebih lengkap.`

      const nominal = action.nominal ?? found.nominal_default ?? family.iuran_nominal
      if (!nominal || nominal <= 0)
        return `❓ Nominal iuran belum diset. Ketik *iuran ${found.nama} 50rb*, atau set default: *iuran bulanan 50rb*.`

      const periode = wibPeriode()
      // Catat sebagai pemasukan agar saldo kas naik.
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          family_id: family.id,
          user_id: userId,
          nama_pengeluaran: `Iuran ${found.nama} (${namaPeriode(periode)})`,
          nominal,
          tipe: 'pemasukan',
          kategori: 'Iuran',
        })
        .select('id')
        .single()
      if (txErr) return 'Gagal mencatat iuran. Coba lagi sebentar.'

      const { error: payErr } = await supabase.from('iuran_pembayaran').insert({
        family_id: family.id,
        anggota_id: found.id,
        periode,
        nominal,
        transaction_id: tx?.id ?? null,
      })
      if (payErr) {
        // Bersihkan transaksi kalau pembayaran gagal (mis. sudah bayar periode ini).
        if (tx?.id) await supabase.from('transactions').delete().eq('id', tx.id)
        if (payErr.code === '23505')
          return `ℹ️ ${found.nama} sudah tercatat bayar iuran ${namaPeriode(periode)}.`
        return 'Gagal mencatat iuran. Coba lagi sebentar.'
      }

      return `✅ Iuran *${found.nama}* tercatat (${namaPeriode(periode)})\n💵 ${rupiah(nominal)}`
    }
  }
}
