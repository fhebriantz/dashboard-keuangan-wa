/**
 * Normalisasi nomor WA Indonesia ke format kanonik: 62xxxxxxxxxx
 * (hanya digit, tanpa '+', spasi, atau strip).
 *
 * Ini KRITIS untuk multi-tenant: gateway WA bisa mengirim nomor dalam
 * berbagai format (0812..., +62812..., 62812..., 812...). Kalau tidak
 * dinormalisasi, lookup ke tabel users bisa gagal (keluarga tidak dikenali)
 * atau — lebih buruk — salah cocok. Simpan nomor di DB dalam format yang
 * sama persis dengan hasil fungsi ini.
 *
 * @returns nomor ternormalisasi, atau null jika tidak valid.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null

  // Ambil digit saja (buang +, spasi, strip, dsb).
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // Beberapa gateway kirim format "62812...@c.us" -> sudah tereduksi ke digit.
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1) // 0812... -> 62812...
  } else if (digits.startsWith('8')) {
    digits = '62' + digits // 812... -> 62812...
  }

  if (!digits.startsWith('62')) return null
  // Panjang MSISDN Indonesia wajar: 62 + 9..13 digit.
  if (digits.length < 10 || digits.length > 15) return null

  return digits
}
