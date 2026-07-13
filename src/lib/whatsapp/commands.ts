import type { SupabaseClient } from '@supabase/supabase-js'
import { wibMonthStartISO, wibDayStartISO, formatTanggalWIB } from '@/lib/time'

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
  'Perintah lain:\n' +
  '• *total* — total & sisa anggaran bulan ini\n' +
  '• *laporan* — rekap transaksi bulan ini\n' +
  '• *hari* — pengeluaran hari ini\n' +
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
      const { pengeluaran, pemasukan } = await totalsSince(
        supabase,
        family.id,
        wibMonthStartISO(),
      )
      const saldo = pemasukan - pengeluaran
      let msg =
        `📊 *Bulan ini*\n` +
        `💵 Pemasukan: ${rupiah(pemasukan)}\n` +
        `💰 Pengeluaran: ${rupiah(pengeluaran)}\n` +
        `🧮 Saldo: ${rupiah(saldo)}`
      if (family.anggaran_bulanan != null) {
        const sisa = Number(family.anggaran_bulanan) - pengeluaran
        msg +=
          `\n\nAnggaran: ${rupiah(Number(family.anggaran_bulanan))}\n` +
          (sisa >= 0 ? `Sisa: ${rupiah(sisa)}` : `⚠️ Lewat ${rupiah(-sisa)}`)
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
      const monthStart = wibMonthStartISO()
      const [{ data: list }, tot] = await Promise.all([
        supabase
          .from('transactions')
          .select('nama_pengeluaran, nominal, created_at, tipe')
          .eq('family_id', family.id)
          .gte('created_at', monthStart)
          .order('created_at', { ascending: false })
          .limit(15),
        totalsSince(supabase, family.id, monthStart),
      ])
      const rows = list ?? []
      if (rows.length === 0) return '📋 Belum ada transaksi bulan ini.'
      const lines = rows.map((r) => {
        const tanda = r.tipe === 'pemasukan' ? '➕' : '➖'
        return `${formatTanggalWIB(r.created_at)}  ${tanda} ${r.nama_pengeluaran} — ${rupiah(Number(r.nominal))}`
      })
      const saldo = tot.pemasukan - tot.pengeluaran
      let msg =
        `📋 *Rekap bulan ini* (15 terbaru)\n\n${lines.join('\n')}\n\n` +
        `💵 Pemasukan: ${rupiah(tot.pemasukan)}\n` +
        `💰 Pengeluaran: ${rupiah(tot.pengeluaran)}\n` +
        `🧮 Saldo: ${rupiah(saldo)}`
      if (family.anggaran_bulanan != null) {
        const sisa = Number(family.anggaran_bulanan) - tot.pengeluaran
        msg += sisa >= 0 ? `\nSisa anggaran: ${rupiah(sisa)}` : `\n⚠️ Lewat ${rupiah(-sisa)}`
      }
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
