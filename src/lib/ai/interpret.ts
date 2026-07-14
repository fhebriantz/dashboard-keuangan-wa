import type { ParsedEntry } from '@/lib/parse-entry'
import { normalizeCategory } from '@/lib/category'
import { askGemini, parseJsonObject } from './gemini'

// Hasil pemahaman AI atas satu pesan (fallback saat rule-based tak paham).
export type AiResult =
  | { action: 'catat'; entry: ParsedEntry }
  | { action: 'set_amplop'; kategori: string; nominal: number }
  | { action: 'pindah_amplop'; dari: string; ke: string; nominal: number }
  | { action: 'hapus_amplop'; kategori: string }
  | { action: 'total' | 'laporan' | 'hari' | 'hapus' | 'bantuan' }

const PROMPT =
  'Klasifikasikan pesan keuangan WhatsApp jadi JSON. Field "action" salah satu: ' +
  '"catat" (mencatat transaksi; sertakan tipe:"pemasukan"/"pengeluaran", nama, nominal:int, kategori), ' +
  '"set_amplop" (atur anggaran kategori; sertakan kategori, nominal:int), ' +
  '"pindah_amplop" (geser anggaran; sertakan dari, ke, nominal:int), ' +
  '"hapus_amplop" (hapus anggaran kategori; sertakan kategori), ' +
  '"total", "laporan", "hari", "hapus" (batalkan catatan terakhir), "bantuan", ' +
  'atau "none" jika tak jelas. ' +
  'kategori: Makan/Transport/Tagihan/Belanja/Kesehatan/Hiburan/Anak/Tabungan/Lainnya. ' +
  'nominal rupiah bulat. Balas HANYA JSON. Pesan: '

const SIMPLE = new Set(['total', 'laporan', 'hari', 'hapus', 'bantuan'])

export async function aiInterpret(message: string): Promise<AiResult | null> {
  const text = await askGemini(PROMPT + message)
  if (!text) return null
  const o = parseJsonObject(text)
  if (!o) return null
  const action = String(o.action ?? '')
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }

  if (SIMPLE.has(action)) return { action } as AiResult

  if (action === 'set_amplop') {
    const nominal = num(o.nominal)
    if (!o.kategori || nominal == null) return null
    return { action, kategori: normalizeCategory(String(o.kategori)), nominal }
  }

  if (action === 'pindah_amplop') {
    const nominal = num(o.nominal)
    if (!o.dari || !o.ke || nominal == null) return null
    const dari = normalizeCategory(String(o.dari))
    const ke = normalizeCategory(String(o.ke))
    if (dari === ke) return null
    return { action, dari, ke, nominal }
  }

  if (action === 'hapus_amplop') {
    if (!o.kategori) return null
    return { action, kategori: normalizeCategory(String(o.kategori)) }
  }

  if (action === 'catat') {
    const nominal = num(o.nominal)
    if (nominal == null) return null
    const tipe = o.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran'
    const nama =
      String(o.nama ?? '').trim() || (tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')
    const kategori =
      tipe === 'pemasukan' ? null : o.kategori ? normalizeCategory(String(o.kategori)) : 'Lainnya'
    return { action: 'catat', entry: { tipe, nama, nominal, kategori, kategoriManual: true } }
  }

  return null
}
