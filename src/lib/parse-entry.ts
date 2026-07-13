import { parseTransactionMessage } from './parse-transaction'
import { detectCategory, normalizeCategory } from './category'

export type EntryType = 'pengeluaran' | 'pemasukan'
export type ParsedEntry = {
  tipe: EntryType
  nama: string
  nominal: number
  kategori: string | null // null untuk pemasukan
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

  return { tipe, nama: parsed.nama, nominal: parsed.nominal, kategori }
}
