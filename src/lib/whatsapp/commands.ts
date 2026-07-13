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
  'Catat pengeluaran — ketik langsung, contoh:\n' +
  '• Bensin 50000\n' +
  '• Makan siang 35rb\n' +
  '• Token listrik Rp100.000\n\n' +
  'Perintah lain:\n' +
  '• *total* — total & sisa anggaran bulan ini\n' +
  '• *laporan* — rekap transaksi bulan ini\n' +
  '• *hari* — pengeluaran hari ini\n' +
  '• *hapus* — batalkan catatan terakhir\n' +
  '• *bantuan* — tampilkan menu ini'

async function sumSince(
  supabase: SupabaseClient,
  familyId: string,
  sinceISO: string,
): Promise<{ total: number; count: number }> {
  const { data } = await supabase
    .from('transactions')
    .select('nominal')
    .eq('family_id', familyId)
    .gte('created_at', sinceISO)
  const rows = data ?? []
  const total = rows.reduce((s, r) => s + Number(r.nominal), 0)
  return { total, count: rows.length }
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
      const { total } = await sumSince(supabase, family.id, wibMonthStartISO())
      let msg = `📊 *Bulan ini*\nTotal pengeluaran: ${rupiah(total)}`
      if (family.anggaran_bulanan != null) {
        const sisa = Number(family.anggaran_bulanan) - total
        msg +=
          `\nAnggaran: ${rupiah(Number(family.anggaran_bulanan))}\n` +
          (sisa >= 0 ? `Sisa: ${rupiah(sisa)}` : `⚠️ Lewat ${rupiah(-sisa)}`)
      }
      return msg
    }

    case 'today': {
      const { total, count } = await sumSince(supabase, family.id, wibDayStartISO())
      return `📅 *Hari ini*\n${count} transaksi\nTotal: ${rupiah(total)}`
    }

    case 'laporan': {
      const monthStart = wibMonthStartISO()
      const [{ data: list }, { total }] = await Promise.all([
        supabase
          .from('transactions')
          .select('nama_pengeluaran, nominal, created_at')
          .eq('family_id', family.id)
          .gte('created_at', monthStart)
          .order('created_at', { ascending: false })
          .limit(15),
        sumSince(supabase, family.id, monthStart),
      ])
      const rows = list ?? []
      if (rows.length === 0) return '📋 Belum ada transaksi bulan ini.'
      const lines = rows.map(
        (r) =>
          `${formatTanggalWIB(r.created_at)}  ${r.nama_pengeluaran} — ${rupiah(Number(r.nominal))}`,
      )
      let msg = `📋 *Rekap bulan ini* (15 terbaru)\n\n${lines.join('\n')}\n\nTotal bulan ini: ${rupiah(total)}`
      if (family.anggaran_bulanan != null) {
        const sisa = Number(family.anggaran_bulanan) - total
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
