import { parseTransactionMessage } from './parse-transaction'

export type EntryType = 'pengeluaran' | 'pemasukan'
export type ParsedEntry = {
  tipe: EntryType
  nama: string
  nominal: number
}

// Kata kunci pemicu PEMASUKAN di awal pesan. Tanpa ini -> pengeluaran.
const INCOME_PREFIX = /^\s*(pemasukan|masuk|terima|income)\b\s*/i
const PLUS_PREFIX = /^\s*\+\s*/

/**
 * Tentukan tipe transaksi + ekstrak nama & nominal.
 *
 *   "Bensin 50000"          -> { tipe: 'pengeluaran', nama: 'Bensin', nominal: 50000 }
 *   "masuk gaji 5000000"    -> { tipe: 'pemasukan',  nama: 'gaji',   nominal: 5000000 }
 *   "pemasukan bonus 1jt"   -> { tipe: 'pemasukan',  nama: 'bonus',  nominal: 1000000 }
 *   "+2000000 THR"          -> { tipe: 'pemasukan',  nama: 'THR',    nominal: 2000000 }
 *   "masuk 5000000"         -> { tipe: 'pemasukan',  nama: 'Pemasukan', nominal: 5000000 }
 */
export function parseEntry(message: string): ParsedEntry | null {
  const trimmed = (message ?? '').trim()
  if (!trimmed) return null

  let tipe: EntryType = 'pengeluaran'
  let rest = trimmed

  const m = trimmed.match(INCOME_PREFIX) ?? trimmed.match(PLUS_PREFIX)
  if (m) {
    tipe = 'pemasukan'
    rest = trimmed.slice(m[0].length)
  }

  let parsed = parseTransactionMessage(rest)
  // Untuk pemasukan tanpa keterangan ("masuk 5000000"), beri nama default.
  if (!parsed && tipe === 'pemasukan') {
    parsed = parseTransactionMessage('Pemasukan ' + rest)
  }
  if (!parsed) return null

  return { tipe, nama: parsed.nama, nominal: parsed.nominal }
}
