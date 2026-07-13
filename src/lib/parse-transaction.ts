export type ParsedTransaction = {
  nama: string
  nominal: number
}

/**
 * Ekstrak { nama, nominal } dari ketikan bebas user di WhatsApp.
 *
 * Contoh yang ditangani:
 *   "Bensin 50000"                 -> { nama: "Bensin", nominal: 50000 }
 *   "Makan siang 35rb"             -> { nama: "Makan siang", nominal: 35000 }
 *   "Kopi 25k"                     -> { nama: "Kopi", nominal: 25000 }
 *   "beli token listrik Rp. 100.000,-" -> { nama: "beli token listrik", nominal: 100000 }
 *   "Servis motor 1.5jt"           -> { nama: "Servis motor", nominal: 1500000 }
 *
 * Strategi:
 *   1. Ambil ANGKA TERAKHIR dalam teks sebagai nominal (nominal umumnya
 *      diketik di akhir kalimat).
 *   2. Satuan (k / rb / ribu / jt / juta) dikonversi ke rupiah penuh.
 *   3. Untuk angka BER-satuan, titik/koma = desimal ("1.5jt" = 1.500.000).
 *      Untuk angka TANPA satuan, titik/koma = pemisah ribuan ("100.000" = 100000).
 *   4. Bersihkan sisa "Rp", titik, koma, dan strip dari nama.
 *
 * @returns hasil parse, atau null jika tak ada nominal valid / nama kosong.
 */
export function parseTransactionMessage(text: string): ParsedTransaction | null {
  const cleaned = (text ?? '').trim()
  if (!cleaned) return null

  // grup 1 = angka (boleh ada . / , pemisah), grup 2 = satuan opsional.
  const re = /(\d+(?:[.,]\d+)*)\s*(jt|juta|rb|ribu|k)?/gi

  let match: RegExpExecArray | null
  let last: { value: number; start: number; end: number } | null = null

  while ((match = re.exec(cleaned)) !== null) {
    const rawNum = match[1]
    const unit = (match[2] || '').toLowerCase()
    if (!rawNum) continue

    let value: number
    if (unit) {
      // Ada satuan -> pemisah diperlakukan sebagai desimal.
      const dec = parseFloat(rawNum.replace(',', '.'))
      if (Number.isNaN(dec)) continue
      const mult = unit === 'jt' || unit === 'juta' ? 1_000_000 : 1_000
      value = dec * mult
    } else {
      // Tanpa satuan -> pemisah = ribuan, buang semua.
      value = Number(rawNum.replace(/[.,]/g, ''))
    }

    if (Number.isNaN(value) || value <= 0) continue
    last = { value, start: match.index, end: re.lastIndex }
  }

  if (!last) return null

  let nama = (cleaned.slice(0, last.start) + ' ' + cleaned.slice(last.end))
    .replace(/\brp\b\.?/gi, ' ') // buang "Rp" / "Rp."
    .replace(/[.,\-]+/g, ' ') // buang sisa titik/koma/strip (mis. ",-")
    .replace(/\s+/g, ' ')
    .trim()

  if (!nama) return null

  return { nama, nominal: Math.round(last.value * 100) / 100 }
}
