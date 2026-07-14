import type { EntryType, ParsedEntry } from '@/lib/parse-entry'
import { normalizeCategory } from '@/lib/category'

/**
 * Parser AI CADANGAN — hanya dipakai saat rule-based gagal (biaya minimal).
 *
 * Aman & opsional:
 *  - Default MATI: kalau AI_PROVIDER tidak di-set → return null → rule-based saja.
 *  - RANTAI MODEL: kalau model pertama kena limit (429) / sibuk (503) / tak
 *    tersedia (404) / timeout → otomatis coba model berikutnya. Kalau SEMUA
 *    model gagal → return null → balik ke rule-based.
 *  - Provider pluggable. Contoh: Google Gemini (free tier, akun PRIBADI).
 */

// Prompt ringkas (hemat token input) tapi tetap jelas.
const PROMPT =
  'Ekstrak transaksi keuangan jadi JSON {"tipe","nama","nominal","kategori"}. ' +
  'tipe: "pemasukan" jika uang masuk (gaji/bonus/terima), selain itu "pengeluaran". ' +
  'nominal: rupiah bulat (integer); 0 jika tak jelas. ' +
  'kategori (khusus pengeluaran): Makan/Transport/Tagihan/Belanja/Kesehatan/Hiburan/Anak/Tabungan/Lainnya; pemasukan=null. ' +
  'nama: singkat. Pesan: '

// Model default — diurut prioritas → cadangan. Utamakan yang kuota harian
// (RPD) paling besar: gemini-3.1-flash-lite = 500/hari (sisanya ~20/hari).
// Override/tambah lewat GEMINI_MODELS (dipisah koma).
const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite', // RPD 500 — paling lega
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
]

function modelChain(): string[] {
  const raw = process.env.GEMINI_MODELS
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean)
  const first = process.env.GEMINI_MODEL?.trim()
  const chain = first ? [first, ...DEFAULT_MODELS] : [...DEFAULT_MODELS]
  return [...new Set(chain)] // buang duplikat, jaga urutan
}

// Banyak API key (akun Google berbeda) — dipisah koma di GEMINI_API_KEYS.
// Kalau satu key kena limit harian, otomatis dicoba key berikutnya.
function apiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS
  if (multi) return multi.split(',').map((s) => s.trim()).filter(Boolean)
  const single = process.env.GEMINI_API_KEY?.trim()
  return single ? [single] : []
}

function toEntry(text: string): ParsedEntry | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  // Beberapa model membungkus dalam array [{...}] — ambil elemen pertama.
  const obj = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>
  if (!obj || typeof obj !== 'object') return null
  const nominal = Number(obj.nominal)
  if (!Number.isFinite(nominal) || nominal <= 0) return null
  const tipe: EntryType = obj.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran'
  const nama =
    String(obj.nama ?? '').trim() || (tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')
  const kategori =
    tipe === 'pemasukan' ? null : obj.kategori ? normalizeCategory(String(obj.kategori)) : 'Lainnya'
  return { tipe, nama, nominal: Math.round(nominal), kategori, kategoriManual: true }
}

/** Panggil satu model. retry=true artinya "coba model lain" (limit/sibuk/timeout). */
async function callModel(
  model: string,
  key: string,
  message: string,
): Promise<{ retry: boolean; entry: ParsedEntry | null }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT + message }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
            maxOutputTokens: 120, // JSON kita kecil -> batasi output (hemat token)
            thinkingConfig: { thinkingBudget: 0 }, // matikan "thinking" -> hemat + cepat + tak kepotong
          },
        }),
      },
    )
    // Limit/sibuk/server/model-tak-ada, atau key bermasalah (401/403) ->
    // coba kombinasi (model/key) berikutnya.
    if ([429, 500, 502, 503, 404, 401, 403].includes(res.status)) return { retry: true, entry: null }
    if (!res.ok) return { retry: false, entry: null } // mis. 400 (permintaan salah) -> berhenti

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { retry: true, entry: null }
    // Model menjawab: pakai hasilnya (entry atau null) — tak perlu model lain.
    return { retry: false, entry: toEntry(text) }
  } catch {
    return { retry: true, entry: null } // timeout / jaringan -> coba model lain
  } finally {
    clearTimeout(timer)
  }
}

export async function aiParseEntry(message: string): Promise<ParsedEntry | null> {
  if (process.env.AI_PROVIDER !== 'gemini') return null
  const keys = apiKeys()
  if (keys.length === 0) return null
  const models = modelChain()

  // Coba tiap key × tiap model. Limit/error -> lanjut kombinasi berikutnya.
  for (const key of keys) {
    for (const model of models) {
      const { retry, entry } = await callModel(model, key, message)
      if (entry) return entry // berhasil
      if (!retry) return null // model menjawab tapi tak bisa parse -> rule-based
      // limit/sibuk/key bermasalah -> lanjut model/key berikutnya
    }
  }
  return null // semua kombinasi gagal -> rule-based
}
