import type { SupabaseClient } from '@supabase/supabase-js'
import { wibMonthStartISO, wibDayStartISO, formatTanggalWIB } from '@/lib/time'
import { parseTransactionMessage } from '@/lib/parse-transaction'
import { normalizeCategory, emojiOf } from '@/lib/category'
import { monthlyData, type CategoryRow } from '@/lib/report-data'
import { getPricingConfig, getPackages, rupiah as rp } from '@/lib/pricing'

/** Apakah pesan dari nomor tak terdaftar bermaksud mendaftar? */
export function isRegisterIntent(message: string): boolean {
  return /^(daftar|mendaftar|mau daftar|register|langganan|berlangganan)/i.test(
    (message ?? '').trim(),
  )
}

/** Info onboarding untuk calon pelanggan (harga + link form). */
export async function registerInfoText(supabase: SupabaseClient): Promise<string> {
  const [cfg, pkgs] = await Promise.all([
    getPricingConfig(supabase),
    getPackages(supabase),
  ])
  const base = process.env.APP_URL?.replace(/\/$/, '')
  const paketList = pkgs.length
    ? pkgs.map((p) => `• ${p.label}`).join('\n')
    : '• (hubungi admin)'
  let msg =
    '🙌 Mau berlangganan *Dashboard Keuangan WA*?\n\n' +
    'Catat keuangan bersama pasangan, keluarga, atau tim — cukup lewat chat.\n\n' +
    `*Harga:* ${rp(cfg.harga_keluarga)}/grup + ${rp(cfg.harga_anggota)}/anggota per bulan\n\n` +
    `*Paket durasi:*\n${paketList}\n\n`
  msg += base
    ? `Daftar di sini (isi 1 menit):\n${base}/daftar`
    : 'Balas pesan ini untuk info pendaftaran.'
  return msg
}

/**
 * Deteksi perintah set anggaran per kategori:
 *   "anggaran makan 2jt" / "budget transport 500rb" / "amplop tabungan 1jt"
 */
export function detectSetBudget(
  message: string,
): { kategori: string; nominal: number } | null {
  const m = (message ?? '').trim().match(/^(anggaran|budget|amplop)\b\s*(.*)$/i)
  if (!m) return null
  const rest = m[2].trim()
  if (!rest) return null
  const parsed = parseTransactionMessage(rest) // nama = kategori, nominal
  if (!parsed) return null
  return { kategori: normalizeCategory(parsed.nama), nominal: parsed.nominal }
}

/**
 * Perintah bot. Sengaja menerima DUA gaya:
 *   - dengan slash: /help, /total
 *   - tanpa slash : help, total, bantuan
 * karena user WA sering lupa mengetik slash. Cocokkan HANYA jika pesan
 * berupa kata perintah utuh (biar "total belanja 50000" tetap dianggap
 * pencatatan, bukan perintah).
 */
export type CommandType = 'help' | 'total' | 'laporan' | 'today' | 'hapus'

export function detectCommand(message: string): CommandType | null {
  const t = message.trim().toLowerCase().replace(/^\//, '').trim()
  if (['help', 'bantuan', 'menu', '?'].includes(t)) return 'help'
  if (['total', 'saldo', 'sisa', 'anggaran'].includes(t)) return 'total'
  if (['laporan', 'rekap', 'report'].includes(t)) return 'laporan'
  if (['hari', 'hari ini', 'today', 'harian'].includes(t)) return 'today'
  if (['hapus', 'batal', 'undo', 'hapus terakhir'].includes(t)) return 'hapus'
  return null
}

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

/** Satu baris ringkasan kategori: realisasi vs anggaran amplop. */
function catLine(cat: CategoryRow): string {
  const e = emojiOf(cat.kategori)
  if (cat.budget != null) {
    const sisa = cat.budget - cat.spent
    const tail =
      sisa >= 0 ? `(sisa ${rupiah(sisa)})` : `⚠️ lewat ${rupiah(-sisa)}`
    return `${e} ${cat.kategori}: ${rupiah(cat.spent)} / ${rupiah(cat.budget)} ${tail}`
  }
  return `${e} ${cat.kategori}: ${rupiah(cat.spent)}`
}

/** Link laporan web keluarga, jika APP_URL di-set. */
function reportLink(familyId: string): string | null {
  const base = process.env.APP_URL?.replace(/\/$/, '')
  return base ? `${base}/laporan/${familyId}` : null
}

type Family = { id: string; nama_keluarga: string; anggaran_bulanan: number | null }
type User = { id: string; nama: string }

const HELP_TEXT =
  '📌 *Menu Bot Keuangan*\n\n' +
  'Catat *pengeluaran* — ketik langsung:\n' +
  '• Bensin 50000\n' +
  '• Makan siang 35rb\n\n' +
  'Catat *pemasukan* — pakai kata "masuk":\n' +
  '• masuk gaji 5000000\n' +
  '• pemasukan bonus 1jt\n\n' +
  'Atur *amplop* (jatah per kategori):\n' +
  '• anggaran makan 2jt\n' +
  '• anggaran transport 500rb\n\n' +
  'Perintah lain:\n' +
  '• *total* — ringkasan + per kategori\n' +
  '• *laporan* — rekap lengkap bulan ini\n' +
  '• *hari* — pemasukan/pengeluaran hari ini\n' +
  '• *hapus* — batalkan catatan terakhir\n' +
  '• *bantuan* — tampilkan menu ini'

async function totalsSince(
  supabase: SupabaseClient,
  familyId: string,
  sinceISO: string,
): Promise<{ pengeluaran: number; pemasukan: number; count: number }> {
  const { data } = await supabase
    .from('transactions')
    .select('nominal, tipe')
    .eq('family_id', familyId)
    .gte('created_at', sinceISO)
  const rows = data ?? []
  let pengeluaran = 0
  let pemasukan = 0
  for (const r of rows) {
    if (r.tipe === 'pemasukan') pemasukan += Number(r.nominal)
    else pengeluaran += Number(r.nominal)
  }
  return { pengeluaran, pemasukan, count: rows.length }
}

export async function handleCommand(
  supabase: SupabaseClient,
  family: Family,
  user: User,
  type: CommandType,
): Promise<string> {
  switch (type) {
    case 'help':
      return HELP_TEXT

    case 'total': {
      const data = await monthlyData(supabase, family.id, wibMonthStartISO())
      let msg =
        `📊 *Bulan ini*\n` +
        `💵 Pemasukan: ${rupiah(data.pemasukan)}\n` +
        `💰 Pengeluaran: ${rupiah(data.pengeluaran)}\n` +
        `🧮 Saldo: ${rupiah(data.saldo)}`
      if (data.categories.length > 0) {
        msg += '\n\n*Per kategori:*\n' + data.categories.map(catLine).join('\n')
      }
      return msg
    }

    case 'today': {
      const { pengeluaran, pemasukan, count } = await totalsSince(
        supabase,
        family.id,
        wibDayStartISO(),
      )
      return (
        `📅 *Hari ini* (${count} transaksi)\n` +
        `💵 Pemasukan: ${rupiah(pemasukan)}\n` +
        `💰 Pengeluaran: ${rupiah(pengeluaran)}`
      )
    }

    case 'laporan': {
      const data = await monthlyData(supabase, family.id, wibMonthStartISO())
      if (data.rows.length === 0) return '📋 Belum ada transaksi bulan ini.'

      let msg = '📋 *Rekap bulan ini*\n'

      if (data.categories.length > 0) {
        msg += '\n*Per kategori:*\n' + data.categories.map(catLine).join('\n') + '\n'
      }

      const rincian = data.rows.slice(0, 15).map((r) => {
        const tanda = r.tipe === 'pemasukan' ? '➕' : '➖'
        return `${formatTanggalWIB(r.created_at)}  ${tanda} ${r.nama_pengeluaran} — ${rupiah(Number(r.nominal))}`
      })
      msg += `\n*Rincian (15 terbaru):*\n${rincian.join('\n')}\n`

      msg +=
        `\n💵 Pemasukan: ${rupiah(data.pemasukan)}\n` +
        `💰 Pengeluaran: ${rupiah(data.pengeluaran)}\n` +
        `🧮 Saldo: ${rupiah(data.saldo)}`

      const link = reportLink(family.id)
      if (link) msg += `\n\n🔗 Laporan lengkap: ${link}`
      return msg
    }

    case 'hapus': {
      const { data: last } = await supabase
        .from('transactions')
        .select('id, nama_pengeluaran, nominal')
        .eq('family_id', family.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!last) return '↩️ Tidak ada catatan milikmu yang bisa dihapus.'
      const { error } = await supabase.from('transactions').delete().eq('id', last.id)
      if (error) return 'Gagal menghapus, coba lagi sebentar.'
      return `🗑️ Dibatalkan: ${last.nama_pengeluaran} — ${rupiah(Number(last.nominal))}`
    }
  }
}
