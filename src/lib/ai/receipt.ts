import type { ParsedEntry } from '@/lib/parse-entry'
import { normalizeCategory } from '@/lib/category'
import { askGeminiParts, parseJsonObject, aiEnabled } from './gemini'

const PROMPT =
  'Ini foto struk belanja. Baca dan kembalikan JSON {"nama","nominal","kategori"}. ' +
  'nominal = TOTAL yang dibayar (rupiah bulat, integer). ' +
  'nama = nama toko/merchant singkat. ' +
  'kategori salah satu: Makan/Transport/Tagihan/Belanja/Kesehatan/Hiburan/Anak/Tabungan/Lainnya. ' +
  'Kalau bukan struk atau total tak terbaca, nominal = 0. Balas HANYA JSON.'

/**
 * Baca struk dari URL gambar (dikirim WA gateway) -> transaksi pengeluaran.
 * Hanya dipanggil saat ADA foto (jarang) -> hemat. null kalau gagal/mati.
 */
export async function aiReadReceipt(imageUrl: string): Promise<ParsedEntry | null> {
  if (!aiEnabled() || !imageUrl) return null

  // Ambil gambar -> base64 (dengan timeout agar tak menggantung).
  let base64: string
  let mime = 'image/jpeg'
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(imageUrl, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    mime = res.headers.get('content-type')?.split(';')[0] || mime
    if (!mime.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 4 * 1024 * 1024) return null // >4MB: lewati (hemat token)
    base64 = buf.toString('base64')
  } catch {
    return null
  }

  const text = await askGeminiParts(
    [{ inline_data: { mime_type: mime, data: base64 } }, { text: PROMPT }],
    150,
  )
  if (!text) return null
  const o = parseJsonObject(text)
  if (!o) return null
  const nominal = Number(o.nominal)
  if (!Number.isFinite(nominal) || nominal <= 0) return null

  return {
    tipe: 'pengeluaran',
    nama: String(o.nama ?? '').trim() || 'Struk belanja',
    nominal: Math.round(nominal),
    kategori: o.kategori ? normalizeCategory(String(o.kategori)) : 'Belanja',
    kategoriManual: true,
  }
}
