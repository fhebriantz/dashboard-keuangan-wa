import Link from 'next/link'
import ReportCharts from '../laporan/[id]/ReportCharts'
import MarketingNav from '../MarketingNav'
import type { ChartData } from '@/lib/report-data'

export const dynamic = 'force-static'

export const metadata = { title: 'Demo Laporan — Dashboard Keuangan WA' }

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

// Data contoh 30 hari (seeded, stabil — bukan diambil dari akun manapun).
function buildDemo(): { chart: ChartData; pemasukan: number; pengeluaran: number; saldo: number } {
  let s = 20260714 >>> 0
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
  const rnd = (a: number, b: number) => Math.round((a + rng() * (b - a)) / 1000) * 1000
  const DAYS = 30

  const cats = ['Makan', 'Transport', 'Tagihan', 'Belanja', 'Lainnya']
  const catDay: Record<string, number[]> = Object.fromEntries(cats.map((c) => [c, new Array(DAYS).fill(0)]))
  const outDay: number[] = [], inDay: number[] = [], sisa: number[] = []
  let run = 0

  for (let i = 0; i < DAYS; i++) {
    let masuk = 0
    if (i === 0) masuk = 10000000
    else if (i === 14) masuk = 750000
    catDay.Makan[i] = rnd(15000, 90000)
    catDay.Transport[i] = rng() < 0.7 ? rnd(10000, 60000) : 0
    catDay.Tagihan[i] = rng() < 0.15 ? rnd(150000, 500000) : 0
    catDay.Belanja[i] = rng() < 0.3 ? rnd(50000, 200000) : 0
    catDay.Lainnya[i] = rng() < 0.25 ? rnd(20000, 120000) : 0
    const out = cats.reduce((t, c) => t + catDay[c][i], 0)
    outDay.push(out); inDay.push(masuk); run += masuk - out; sisa.push(run)
  }

  const total = (a: number[]) => a.reduce((x, y) => x + y, 0)
  const catTotal = Object.fromEntries(cats.map((c) => [c, total(catDay[c])]))
  const sorted = [...cats].sort((a, b) => catTotal[b] - catTotal[a])

  const areaSeries = sorted.slice(0, 3).map((c) => ({ kategori: c, data: catDay[c] }))
  const restArea = new Array(DAYS).fill(0)
  sorted.slice(3).forEach((c) => catDay[c].forEach((v, i) => (restArea[i] += v)))
  areaSeries.push({ kategori: 'Lainnya', data: restArea })

  const donut = sorted.map((c) => ({ kategori: c, total: catTotal[c] }))

  const chart: ChartData = {
    labels: Array.from({ length: DAYS }, (_, i) => i + 1),
    pengeluaranHarian: outDay,
    sisaHarian: sisa,
    areaSeries,
    donut,
  }
  const pemasukan = total(inDay), pengeluaran = total(outDay)
  return { chart, pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }
}

export default function DemoPage() {
  const { chart, pemasukan, pengeluaran, saldo } = buildDemo()

  return (
    <>
      <MarketingNav />
      <main style={wrap}>
        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>Demo Laporan</h1>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Data contoh · Juli 2026</div>

      <div style={{ ...cardsRow, marginTop: 16 }}>
        <div style={statCard}><div style={statLabel}>Pemasukan</div><div style={{ ...statBig, color: '#16a34a' }}>{rupiah(pemasukan)}</div></div>
        <div style={statCard}><div style={statLabel}>Pengeluaran</div><div style={{ ...statBig, color: '#dc2626' }}>{rupiah(pengeluaran)}</div></div>
      </div>
      <div style={cardsRow}>
        <div style={statCard}><div style={statLabel}>Sisa Saldo</div><div style={{ ...statBig, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{rupiah(saldo)}</div></div>
      </div>

      <ReportCharts chart={chart} />

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href="/daftar" style={cta}>Mau punya laporan seperti ini? Daftar →</Link>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 20 }}>Dashboard Keuangan WA · data contoh</p>
      </main>
    </>
  )
}

const wrap: React.CSSProperties = { fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '0 auto', padding: '28px 18px 48px', color: 'var(--text)', minHeight: '100vh' }
const cardsRow: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 }
const statCard: React.CSSProperties = { flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', background: 'var(--surface)' }
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 6 }
const statBig: React.CSSProperties = { fontSize: 19, fontWeight: 700 }
const cta: React.CSSProperties = { display: 'inline-block', background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }
