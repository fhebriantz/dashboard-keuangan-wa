// Helper batas waktu zona WIB (UTC+7) untuk rekap harian/bulanan.
// created_at disimpan sebagai timestamptz (UTC) di Postgres; di sini kita
// hitung awal hari/bulan menurut WIB lalu ubah ke ISO (UTC) untuk query.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

export function wibMonthStartISO(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS)
  const startUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - WIB_OFFSET_MS
  return new Date(startUtc).toISOString()
}

export function wibDayStartISO(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS)
  const startUtc =
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS
  return new Date(startUtc).toISOString()
}

export function formatTanggalWIB(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso))
}

/** Periode iuran 'YYYY-MM' menurut WIB (dipakai kas komunitas). */
export function wibPeriode(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS)
  const y = wib.getUTCFullYear()
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Nama periode enak dibaca dari 'YYYY-MM', mis. "Juli 2026". */
export function namaPeriode(periode: string): string {
  const [y, m] = periode.split('-').map(Number)
  if (!y || !m) return periode
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
}

export function namaBulanWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    month: 'long',
    year: 'numeric',
  }).format(now)
}
