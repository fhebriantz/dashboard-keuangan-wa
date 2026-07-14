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
  totalBudget: number | null // jumlah semua amplop; null jika belum ada amplop
}

export type ChartData = {
  labels: number[] // tanggal 1..hari-ini
  pengeluaranHarian: number[]
  sisaHarian: number[] // saldo berjalan (pemasukan - pengeluaran) kumulatif
  areaSeries: { kategori: string; data: number[] }[] // top 3 + Lainnya
  donut: { kategori: string; total: number }[] // top 5 + Lainnya
}

const WIB_MS = 7 * 60 * 60 * 1000

/**
 * Bangun data grafik harian dari transaksi bulan berjalan (murni, tanpa query).
 * Sumbu X = tanggal 1 s/d hari ini (WIB). Kategori dikelompokkan agar chart
 * tetap terbaca: area = 3 teratas + "Lainnya", donut = 5 teratas + "Lainnya".
 */
export function buildChartData(
  rows: TxRow[],
  now: Date = new Date(),
): ChartData {
  const wibNow = new Date(now.getTime() + WIB_MS)
  const n = wibNow.getUTCDate() // jumlah hari sampai hari ini
  const dayIndex = (iso: string) =>
    new Date(new Date(iso).getTime() + WIB_MS).getUTCDate() - 1

  const outDay = new Array(n).fill(0)
  const inDay = new Array(n).fill(0)
  const catDay: Record<string, number[]> = {}
  const catTotal: Record<string, number> = {}

  for (const r of rows) {
    const d = dayIndex(r.created_at)
    if (d < 0 || d >= n) continue
    if (r.tipe === 'pemasukan') {
      inDay[d] += Number(r.nominal)
      continue
    }
    outDay[d] += Number(r.nominal)
    const k = r.kategori || 'Lainnya'
    ;(catDay[k] ??= new Array(n).fill(0))[d] += Number(r.nominal)
    catTotal[k] = (catTotal[k] ?? 0) + Number(r.nominal)
  }

  const sisaHarian: number[] = []
  let run = 0
  for (let i = 0; i < n; i++) {
    run += inDay[i] - outDay[i]
    sisaHarian.push(run)
  }

  const sorted = Object.keys(catTotal).sort((a, b) => catTotal[b] - catTotal[a])

  // Area: 3 teratas + gabungan sisanya sebagai "Lainnya".
  const areaMap = new Map<string, number[]>()
  sorted.slice(0, 3).forEach((k) => areaMap.set(k, catDay[k]))
  const restArea = sorted.slice(3)
  if (restArea.length) {
    const acc = areaMap.get('Lainnya') ?? new Array(n).fill(0)
    for (const k of restArea) for (let i = 0; i < n; i++) acc[i] += catDay[k][i]
    areaMap.set('Lainnya', acc)
  }
  const areaSeries = [...areaMap].map(([kategori, data]) => ({ kategori, data }))

  // Donut: 5 teratas + gabungan sisanya.
  const donutMap = new Map<string, number>()
  sorted.slice(0, 5).forEach((k) => donutMap.set(k, catTotal[k]))
  const restDonut = sorted.slice(5)
  if (restDonut.length) {
    const extra = restDonut.reduce((s, k) => s + catTotal[k], 0)
    donutMap.set('Lainnya', (donutMap.get('Lainnya') ?? 0) + extra)
  }
  const donut = [...donutMap].map(([kategori, total]) => ({ kategori, total }))

  return { labels: Array.from({ length: n }, (_, i) => i + 1), pengeluaranHarian: outDay, sisaHarian, areaSeries, donut }
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

  const budgetValues = Object.values(budgetByCat)
  const totalBudget = budgetValues.length
    ? budgetValues.reduce((s, v) => s + v, 0)
    : null

  return {
    rows,
    pemasukan,
    pengeluaran,
    saldo: pemasukan - pengeluaran,
    categories,
    totalBudget,
  }
}
