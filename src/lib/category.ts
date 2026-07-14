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
  Makan: ['makan', 'makanan', 'nasi', 'kopi', 'ngopi', 'jajan', 'jajanan', 'sarapan', 'minum', 'minuman', 'snack', 'cemilan', 'camilan', 'gofood', 'grabfood', 'shopeefood', 'warteg', 'warung', 'padang', 'bakso', 'mie', 'mi', 'ayam', 'sate', 'seblak', 'cafe', 'kafe', 'resto', 'restoran', 'nasgor', 'gorengan', 'martabak', 'soto', 'geprek', 'boba', 'teh', 'es', 'roti', 'kue', 'buah', 'sayur', 'lauk', 'catering', 'katering', 'sarabba'],
  Transport: ['bensin', 'bbm', 'pertalite', 'pertamax', 'solar', 'dexlite', 'parkir', 'tol', 'etoll', 'grab', 'gojek', 'ojek', 'ojol', 'angkot', 'busway', 'krl', 'mrt', 'lrt', 'transport', 'transportasi', 'bus', 'tiket', 'travel', 'servis', 'service', 'oli', 'ban', 'kereta', 'pesawat', 'taksi', 'taxi', 'maxim', 'indrive', 'cuci', 'tambal'],
  Tagihan: ['listrik', 'token', 'pln', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'pulsa', 'kuota', 'paket', 'bpjs', 'iuran', 'cicilan', 'kredit', 'angsuran', 'tagihan', 'sewa', 'kontrakan', 'kos', 'kost', 'pajak', 'asuransi', 'netflix', 'spotify', 'youtube', 'langganan', 'gas', 'lpg', 'elpiji'],
  Belanja: ['belanja', 'sabun', 'shampoo', 'sampo', 'pasta', 'odol', 'beras', 'minyak', 'gula', 'telur', 'tepung', 'indomaret', 'alfamart', 'alfamidi', 'supermarket', 'pasar', 'baju', 'celana', 'sepatu', 'sandal', 'tas', 'kosmetik', 'skincare', 'bedak', 'parfum', 'deterjen', 'tissue', 'tisu', 'peralatan', 'perabot', 'elektronik', 'hp', 'gadget'],
  Kesehatan: ['obat', 'dokter', 'apotek', 'apotik', 'vitamin', 'rumah sakit', 'rs', 'klinik', 'periksa', 'medis', 'suntik', 'vaksin', 'lab', 'rontgen', 'gigi', 'kacamata', 'terapi', 'puskesmas'],
  Hiburan: ['nonton', 'bioskop', 'cinema', 'game', 'games', 'liburan', 'wisata', 'wisatakuliner', 'main', 'karaoke', 'konser', 'tiket', 'rekreasi', 'jalan', 'staycation', 'hotel', 'renang', 'gym', 'olahraga'],
  Anak: ['anak', 'susu', 'popok', 'diapers', 'pampers', 'sekolah', 'spp', 'mainan', 'les', 'buku', 'seragam', 'bayi', 'balita', 'daycare', 'tk', 'paud'],
  Tabungan: ['tabung', 'nabung', 'tabungan', 'saving', 'savings', 'investasi', 'invest', 'reksadana', 'reksa', 'saham', 'emas', 'deposito', 'dana darurat'],
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

// Jarak edit (Levenshtein) dengan batas — untuk toleransi typo.
function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let best = i
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diag = prev[j]
      prev[j] = cur
      if (cur < best) best = cur
    }
    if (best > max) return max + 1 // early exit: baris ini sudah melebihi batas
  }
  return prev[b.length]
}

/**
 * Tebak kategori dari nama pengeluaran. Coba cocok persis (substring) dulu,
 * lalu toleransi typo (fuzzy) untuk kata kunci yang cukup panjang. Default 'Lainnya'.
 */
export function detectCategory(nama: string): string {
  const t = nama.toLowerCase()
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return cat
  }
  // Fuzzy: bandingkan tiap kata (>=4 huruf) dengan kata kunci (>=5 huruf).
  const words = t.split(/[^a-z]+/).filter((w) => w.length >= 4)
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    for (const k of kws) {
      if (k.length < 5) continue
      if (words.some((w) => editDistance(w, k, 1) <= 1)) return cat
    }
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

// Warna per kategori (dari palet dataviz tervalidasi) — stabil di semua chart.
export const CATEGORY_COLOR: Record<string, string> = {
  Makan: '#1baf7a',
  Transport: '#eb6834',
  Tagihan: '#2a78d6',
  Belanja: '#eda100',
  Kesehatan: '#e34948',
  Hiburan: '#e87ba4',
  Anak: '#4a3aa7',
  Tabungan: '#008300',
  Lainnya: '#94a3b8',
}

export function colorOf(kategori: string): string {
  return CATEGORY_COLOR[kategori] ?? '#94a3b8'
}

// Kata "isian" yang bukan kategori (agar balasan seperti "ok"/"gak tau" tak
// disalahartikan sebagai nama kategori).
const FILLERS = new Set([
  'ok', 'oke', 'okay', 'ya', 'iya', 'yaudah', 'yodah', 'tidak', 'gak', 'ga', 'engga',
  'enggak', 'ndak', 'nggak', 'makasih', 'terimakasih', 'thanks', 'sip', 'mantap',
  'bingung', 'tau', 'gatau', 'skip', 'lewat', 'batal', 'ntar', 'nanti', 'apa', 'hah', 'gak tau', 'ga tau', 'terima kasih',
])

/**
 * Ubah balasan pengguna menjadi kategori — untuk menjawab pertanyaan
 * "masuk kategori apa?". Menerima kategori BAKU (lewat matchCategory) maupun
 * kategori CUSTOM (mis. "Olahraga"), tapi menolak angka & kata filler.
 * Return kategori kanonik/Title-case, atau null kalau bukan kategori.
 */
export function asCategory(input: string): string | null {
  const t = (input ?? '').trim().toLowerCase()
  if (!t || /\d/.test(t) || FILLERS.has(t)) return null
  const known = matchCategory(input)
  if (known) return known
  // Custom: 2-20 huruf/spasi, maksimal 2 kata.
  if (/^[a-zA-Z][a-zA-Z ]{1,19}$/.test(t) && t.split(/\s+/).length <= 2) {
    return normalizeCategory(input)
  }
  return null
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
