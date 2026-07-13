import type { SupabaseClient } from '@supabase/supabase-js'

export type TxRow = {
  nama_pengeluaran: string
  nominal: number
  created_at: string
  tipe: string
  kategori: string | null
}

export type CategoryRow = {
  kategori: string
  spent: number
  budget: number | null
}

export type MonthlyData = {
  rows: TxRow[]
  pemasukan: number
  pengeluaran: number
  saldo: number
  categories: CategoryRow[]
}

/**
 * Ambil semua data bulan berjalan untuk satu keluarga dalam satu tempat:
 * daftar transaksi, total pemasukan/pengeluaran/saldo, dan rekap per
 * kategori (realisasi vs anggaran amplop). Dipakai oleh perintah bot
 * maupun halaman laporan web supaya angkanya selalu konsisten.
 */
export async function monthlyData(
  supabase: SupabaseClient,
  familyId: string,
  monthStartISO: string,
): Promise<MonthlyData> {
  const [{ data: txs }, { data: budgets }] = await Promise.all([
    supabase
      .from('transactions')
      .select('nama_pengeluaran, nominal, created_at, tipe, kategori')
      .eq('family_id', familyId)
      .gte('created_at', monthStartISO)
      .order('created_at', { ascending: false }),
    supabase
      .from('category_budgets')
      .select('kategori, nominal')
      .eq('family_id', familyId),
  ])

  const rows = (txs ?? []) as TxRow[]
  let pemasukan = 0
  let pengeluaran = 0
  const spentByCat: Record<string, number> = {}

  for (const r of rows) {
    if (r.tipe === 'pemasukan') {
      pemasukan += Number(r.nominal)
      continue
    }
    pengeluaran += Number(r.nominal)
    const k = r.kategori || 'Lainnya'
    spentByCat[k] = (spentByCat[k] ?? 0) + Number(r.nominal)
  }

  const budgetByCat: Record<string, number> = {}
  for (const b of budgets ?? []) budgetByCat[b.kategori] = Number(b.nominal)

  const keys = new Set([...Object.keys(spentByCat), ...Object.keys(budgetByCat)])
  const categories: CategoryRow[] = [...keys]
    .map((k) => ({ kategori: k, spent: spentByCat[k] ?? 0, budget: budgetByCat[k] ?? null }))
    .sort((a, b) => b.spent - a.spent)

  return { rows, pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, categories }
}
