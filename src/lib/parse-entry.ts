import { parseTransactionMessage } from './parse-transaction'
import { detectCategory, normalizeCategory } from './category'

export type EntryType = 'pengeluaran' | 'pemasukan'
export type ParsedEntry = {
  tipe: EntryType
  nama: string
  nominal: number
  kategori: string | null // null untuk pemasukan
  kategoriManual: boolean // true jika user override lewat #kategori
}

// Kata kunci pemicu PEMASUKAN di awal pesan. Tanpa ini -> pengeluaran.
const INCOME_PREFIX = /^\s*(pemasukan|masuk|terima|income)\b\s*/i
const PLUS_PREFIX = /^\s*\+\s*/

/**
 * Tentukan tipe + ekstrak nama, nominal, dan kategori.
 *
 *   "Bensin 50000"            -> pengeluaran, nama Bensin, 50000, kategori Transport (auto)
 *   "beli obat 50rb #anak"    -> pengeluaran, kategori Anak (override manual)
 *   "masuk gaji 5000000"      -> pemasukan, kategori null
 */
export function parseEntry(message: string): ParsedEntry | null {
  const trimmed = (message ?? '').trim()
  if (!trimmed) return null

  let tipe: EntryType = 'pengeluaran'
  let rest = trimmed

  const inc = trimmed.match(INCOME_PREFIX) ?? trimmed.match(PLUS_PREFIX)
  if (inc) {
    tipe = 'pemasukan'
    rest = trimmed.slice(inc[0].length)
  }

  // Override kategori manual: "#kategori" di mana saja pada teks.
  let kategoriOverride: string | null = null
  const hash = rest.match(/#([A-Za-z]+)/)
  if (hash) {
    kategoriOverride = normalizeCategory(hash[1])
    rest = rest.replace(/#[A-Za-z]+/, ' ').replace(/\s+/g, ' ').trim()
  }

  let parsed = parseTransactionMessage(rest)
  if (!parsed && tipe === 'pemasukan') {
    parsed = parseTransactionMessage('Pemasukan ' + rest)
  }
  if (!parsed) return null

  const kategori =
    tipe === 'pemasukan' ? null : kategoriOverride ?? detectCategory(parsed.nama)

  return {
    tipe,
    nama: parsed.nama,
    nominal: parsed.nominal,
    kategori,
    kategoriManual: kategoriOverride != null,
  }
}

/**
 * Banyak transaksi dalam satu pesan (satu per baris), boleh campur
 * pemasukan/pengeluaran. Aktif hanya jika >= 2 baris valid.
 *
 *   "gojek 11rb\ngojek 12000\ndimsum 16rb\nmasuk 56rb"
 */
export function parseBulk(
  message: string,
): { entries: ParsedEntry[]; failed: string[] } | null {
  const lines = (message ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const entries: ParsedEntry[] = []
  const failed: string[] = []
  for (const line of lines) {
    const e = parseEntry(line)
    if (e) entries.push(e)
    else failed.push(line)
  }
  return entries.length >= 2 ? { entries, failed } : null
}
