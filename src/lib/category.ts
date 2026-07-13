// Kategori pengeluaran + deteksi otomatis dari kata kunci.
// Tujuan: pelanggan tidak perlu repot memilih kategori — sistem menebak
// dari nama pengeluaran. Bisa dioverride manual dengan "#kategori".

export const CATEGORIES = [
  'Makan',
  'Transport',
  'Tagihan',
  'Belanja',
  'Kesehatan',
  'Hiburan',
  'Anak',
  'Tabungan',
  'Lainnya',
] as const

export const CATEGORY_EMOJI: Record<string, string> = {
  Makan: '🍔',
  Transport: '🚗',
  Tagihan: '🧾',
  Belanja: '🛒',
  Kesehatan: '💊',
  Hiburan: '🎮',
  Anak: '🧒',
  Tabungan: '🏦',
  Lainnya: '📦',
  Pemasukan: '💵',
}

const KEYWORDS: Record<string, string[]> = {
  Makan: ['makan', 'nasi', 'kopi', 'jajan', 'sarapan', 'minum', 'snack', 'gofood', 'grabfood', 'warteg', 'padang', 'bakso', 'mie', 'ayam', 'sate', 'seblak', 'cafe', 'resto'],
  Transport: ['bensin', 'pertalite', 'pertamax', 'solar', 'parkir', 'tol', 'grab', 'gojek', 'ojek', 'ojol', 'angkot', 'busway', 'krl', 'transport', 'bus', 'tiket', 'travel', 'servis', 'oli', 'ban'],
  Tagihan: ['listrik', 'token', 'pln', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'pulsa', 'paket', 'bpjs', 'iuran', 'cicilan', 'kredit', 'angsuran', 'tagihan', 'sewa', 'kontrakan', 'kos'],
  Belanja: ['belanja', 'sabun', 'shampoo', 'beras', 'minyak', 'gula', 'telur', 'indomaret', 'alfamart', 'supermarket', 'pasar', 'baju', 'sepatu', 'kosmetik', 'skincare'],
  Kesehatan: ['obat', 'dokter', 'apotek', 'apotik', 'vitamin', 'rumah sakit', 'rs', 'klinik', 'periksa', 'medis'],
  Hiburan: ['nonton', 'bioskop', 'netflix', 'spotify', 'game', 'liburan', 'wisata', 'main', 'karaoke', 'langganan'],
  Anak: ['anak', 'susu', 'popok', 'diapers', 'pampers', 'sekolah', 'spp', 'mainan', 'les', 'buku'],
  Tabungan: ['tabung', 'nabung', 'saving', 'investasi', 'reksadana', 'emas', 'deposito'],
}

const ALIASES: Record<string, string> = {
  transportasi: 'Transport',
  makanan: 'Makan',
  jajan: 'Makan',
  tagihan: 'Tagihan',
  belanja: 'Belanja',
  kesehatan: 'Kesehatan',
  hiburan: 'Hiburan',
  anak: 'Anak',
  tabungan: 'Tabungan',
  nabung: 'Tabungan',
  lain: 'Lainnya',
  lainnya: 'Lainnya',
}

/** Tebak kategori dari nama pengeluaran. Default 'Lainnya'. */
export function detectCategory(nama: string): string {
  const t = nama.toLowerCase()
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return cat
  }
  return 'Lainnya'
}

/** Rapikan input kategori manual ke bentuk kanonik. */
export function normalizeCategory(input: string): string {
  const t = input.trim().toLowerCase()
  if (!t) return 'Lainnya'
  if (ALIASES[t]) return ALIASES[t]
  const known = CATEGORIES.find((c) => c.toLowerCase() === t)
  if (known) return known
  return input.trim().charAt(0).toUpperCase() + input.trim().slice(1).toLowerCase()
}

export function emojiOf(kategori: string): string {
  return CATEGORY_EMOJI[kategori] ?? '📦'
}

/**
 * Cocokkan sebuah balasan pelanggan ke kategori yang dikenal (tanpa angka).
 * Dipakai saat bot bertanya "masuk kategori apa?" lalu user membalas 1 kata.
 * Return kategori kanonik, atau null kalau bukan kategori yang dikenal.
 */
export function matchCategory(input: string): string | null {
  const t = (input ?? '').trim().toLowerCase()
  if (!t || /\d/.test(t)) return null
  if (ALIASES[t]) return ALIASES[t]
  const known = CATEGORIES.find((c) => c.toLowerCase() === t)
  return known ?? null
}
