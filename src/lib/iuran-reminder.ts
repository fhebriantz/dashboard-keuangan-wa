import type { SupabaseClient } from '@supabase/supabase-js'
import { sendReply } from '@/lib/whatsapp/outbound'
import { wibDayOfMonth, wibPeriode, namaPeriode } from '@/lib/time'

// Reminder iuran (Fase D). Dipanggil dari cron keep-alive harian — TIDAK butuh
// cron terpisah. Kirim WA ke warga yang BELUM bayar iuran periode berjalan,
// HANYA pada tanggal jatuh tempo komunitas -> otomatis maksimal 1x per periode.

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
const MAX_REMINDERS = 40 // batasi per run agar aman dari timeout fungsi & anti-ban

type Family = {
  id: string
  nama_keluarga: string
  iuran_nominal: number | null
  public_slug: string | null
  expired_at: string | null
}

export async function sendIuranReminders(supabase: SupabaseClient): Promise<number> {
  const day = wibDayOfMonth()
  const periode = wibPeriode()
  const base = process.env.APP_URL?.replace(/\/$/, '') ?? ''

  // Komunitas aktif yang jatuh tempo iurannya = hari ini (WIB).
  const { data: fams } = await supabase
    .from('families')
    .select('id, nama_keluarga, iuran_nominal, public_slug, expired_at')
    .eq('mode', 'komunitas')
    .eq('status_langganan', 'active')
    .eq('iuran_jatuh_tempo', day)

  const families = (fams ?? []).filter(
    (f) => !f.expired_at || new Date(f.expired_at) > new Date(),
  ) as Family[]
  if (families.length === 0) return 0

  let sent = 0
  for (const f of families) {
    if (sent >= MAX_REMINDERS) break

    const [{ data: roster }, { data: bayar }] = await Promise.all([
      supabase
        .from('iuran_anggota')
        .select('id, nama, nomor_wa, nominal_default')
        .eq('family_id', f.id)
        .eq('aktif', true)
        .not('nomor_wa', 'is', null),
      supabase.from('iuran_pembayaran').select('anggota_id').eq('family_id', f.id).eq('periode', periode),
    ])

    const paid = new Set((bayar ?? []).map((b) => b.anggota_id as string))
    const unpaid = (roster ?? []).filter((a) => !paid.has(a.id) && a.nomor_wa)

    for (const a of unpaid) {
      if (sent >= MAX_REMINDERS) break
      const nominal = a.nominal_default ?? f.iuran_nominal
      const nomLine = nominal ? ` sebesar *${rupiah(Number(nominal))}*` : ''
      const link = f.public_slug && base ? `\n\nCek laporan: ${base}/kas/${f.public_slug}` : ''
      const msg =
        `🔔 Halo ${a.nama}, iuran *${f.nama_keluarga}* periode ${namaPeriode(periode)}${nomLine} ` +
        `belum tercatat. Mohon segera setor ke bendahara ya. 🙏${link}`
      try {
        await sendReply(a.nomor_wa as string, msg)
        sent++
      } catch (e) {
        console.error('[iuran-reminder] gagal kirim:', (e as Error).message)
      }
    }
  }
  return sent
}
