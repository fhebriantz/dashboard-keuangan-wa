import type { EntryType, ParsedEntry } from '@/lib/parse-entry'
import { normalizeCategory } from '@/lib/category'

/**
 * Parser AI CADANGAN — hanya dipakai saat rule-based gagal (biaya minimal).
 *
 * Aman & opsional:
 *  - Default MATI: kalau AI_PROVIDER tidak di-set, fungsi ini langsung return
 *    null → pemanggil pakai rule-based saja. Tidak ada ketergantungan/biaya.
 *  - Fallback otomatis: error apa pun (limit/429, timeout, jaringan, JSON
 *    rusak) → return null → pemanggil balik ke rule-based.
 *  - Provider pluggable. Contoh di sini: Google Gemini (free tier, akun
 *    PRIBADI — terpisah dari akun kantor).
 */

const PROMPT =
  'Ekstrak SATU transaksi keuangan dari pesan WhatsApp berikut. ' +
  'Balas HANYA JSON: {"tipe","nama","nominal","kategori"}. ' +
  'tipe = "pemasukan" jika uang masuk (gaji, bonus, terima, transfer masuk), selain itu "pengeluaran". ' +
  'nominal = angka rupiah bulat (mis. "dua puluh ribu" -> 20000, "50rb" -> 50000). Jika tak ada nominal jelas, nominal = 0. ' +
  'kategori (khusus pengeluaran) salah satu: Makan, Transport, Tagihan, Belanja, Kesehatan, Hiburan, Anak, Tabungan, Lainnya. Untuk pemasukan, kategori = null. ' +
  'nama = deskripsi singkat.\n\nPesan: '

export async function aiParseEntry(message: string): Promise<ParsedEntry | null> {
  if (process.env.AI_PROVIDER !== 'gemini') return null
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  // Pakai varian "lite-latest": cepat (~1 dtk), murah, dan auto-ikut versi
  // terbaru (tak kena "model pensiun"). Model non-lite bisa 10+ dtk -> timeout.
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT + message }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      },
    )
    if (!res.ok) return null // 429 (limit)/5xx/4xx -> fallback ke rule-based

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const obj = JSON.parse(text)
    const nominal = Number(obj.nominal)
    if (!Number.isFinite(nominal) || nominal <= 0) return null

    const tipe: EntryType = obj.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran'
    const nama =
      String(obj.nama ?? '').trim() || (tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')
    const kategori =
      tipe === 'pemasukan'
        ? null
        : obj.kategori
          ? normalizeCategory(String(obj.kategori))
          : 'Lainnya'

    // kategoriManual: true -> tak perlu tanya kategori lagi (AI sudah menentukan).
    return { tipe, nama, nominal: Math.round(nominal), kategori, kategoriManual: true }
  } catch {
    return null // timeout / jaringan / JSON rusak -> fallback
  } finally {
    clearTimeout(timer)
  }
}
