import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReportCharts from '../../laporan/[id]/ReportCharts'
import MarketingNav from '../../MarketingNav'
import { USE_CASES } from '@/lib/use-cases'
import type { ChartData } from '@/lib/report-data'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }))
}

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

type CatSpec = { name: string; prob: number; min: number; max: number }
type Spec = {
  masuk: string
  keluar: string
  saldo: string
  cats: CatSpec[]
  income: number[] // pemasukan per hari (30)
  roster?: { nominal: number; total: number; paid: number } // untuk kas iuran
}

const NAMES = ['Budi', 'Siti', 'Andi', 'Rina', 'Dewi', 'Agus', 'Sri', 'Eko', 'Wati', 'Joko',
  'Nur', 'Rudi', 'Tuti', 'Bambang', 'Lestari', 'Hadi', 'Yuni', 'Dodi', 'Ani', 'Fajar']

// Sebar `count` pembayaran iuran `nominal` di 15 hari pertama (buat grafik dana masuk).
function iuranIncome(nominal: number, count: number): number[] {
  const arr = new Array(30).fill(0)
  for (let i = 0; i < count; i++) arr[(i * 2) % 15] += nominal
  return arr
}

function specFor(slug: string): Spec {
  switch (slug) {
    case 'rt-rw':
      return {
        masuk: 'Dana masuk', keluar: 'Pengeluaran kas', saldo: 'Saldo kas',
        cats: [
          { name: 'Kebersihan', prob: 0.4, min: 50000, max: 150000 },
          { name: 'Keamanan', prob: 0.2, min: 100000, max: 300000 },
          { name: 'Perlengkapan', prob: 0.25, min: 40000, max: 200000 },
          { name: 'Kegiatan', prob: 0.15, min: 150000, max: 600000 },
          { name: 'Lainnya', prob: 0.2, min: 20000, max: 100000 },
        ],
        income: iuranIncome(50000, 9),
        roster: { nominal: 50000, total: 12, paid: 9 },
      }
    case 'paguyuban':
      return {
        masuk: 'Dana masuk', keluar: 'Pengeluaran kas', saldo: 'Saldo kas',
        cats: [
          { name: 'Konsumsi', prob: 0.4, min: 100000, max: 400000 },
          { name: 'Kegiatan', prob: 0.25, min: 200000, max: 700000 },
          { name: 'Sewa Tempat', prob: 0.12, min: 200000, max: 500000 },
          { name: 'Perlengkapan', prob: 0.25, min: 50000, max: 250000 },
          { name: 'Lainnya', prob: 0.2, min: 20000, max: 120000 },
        ],
        income: iuranIncome(100000, 6),
        roster: { nominal: 100000, total: 8, paid: 6 },
      }
    case 'kas-kelas':
      return {
        masuk: 'Dana masuk', keluar: 'Pengeluaran kas', saldo: 'Saldo kas',
        cats: [
          { name: 'Alat Tulis', prob: 0.35, min: 20000, max: 120000 },
          { name: 'Kegiatan', prob: 0.2, min: 100000, max: 400000 },
          { name: 'Konsumsi', prob: 0.3, min: 30000, max: 150000 },
          { name: 'Kebersihan', prob: 0.25, min: 20000, max: 80000 },
          { name: 'Lainnya', prob: 0.15, min: 15000, max: 90000 },
        ],
        income: iuranIncome(25000, 15),
        roster: { nominal: 25000, total: 20, paid: 15 },
      }
    case 'volunteer':
      return {
        masuk: 'Dana masuk', keluar: 'Pengeluaran kas', saldo: 'Saldo kas',
        cats: [
          { name: 'Sembako', prob: 0.35, min: 200000, max: 1000000 },
          { name: 'Logistik', prob: 0.25, min: 100000, max: 500000 },
          { name: 'Transport', prob: 0.4, min: 50000, max: 250000 },
          { name: 'Konsumsi', prob: 0.3, min: 80000, max: 300000 },
          { name: 'Lainnya', prob: 0.2, min: 20000, max: 150000 },
        ],
        income: (() => { const a = new Array(30).fill(0); a[1] = 2000000; a[8] = 1000000; a[16] = 3000000; a[24] = 750000; return a })(),
      }
    case 'ibadah':
      return {
        masuk: 'Dana masuk', keluar: 'Pengeluaran kas', saldo: 'Saldo kas',
        cats: [
          { name: 'Kebersihan', prob: 0.4, min: 50000, max: 150000 },
          { name: 'Listrik & Air', prob: 0.15, min: 150000, max: 400000 },
          { name: 'Kegiatan', prob: 0.2, min: 200000, max: 800000 },
          { name: 'Perbaikan', prob: 0.12, min: 100000, max: 600000 },
          { name: 'Lainnya', prob: 0.2, min: 20000, max: 120000 },
        ],
        income: (() => { const a = new Array(30).fill(0); for (let i = 0; i < 30; i++) if (i % 7 === 4) a[i] = 1200000 + (i * 30000); return a })(),
      }
    case 'umkm':
      return {
        masuk: 'Penjualan', keluar: 'Belanja usaha', saldo: 'Saldo usaha',
        cats: [
          { name: 'Stok', prob: 0.7, min: 100000, max: 400000 },
          { name: 'Operasional', prob: 0.4, min: 20000, max: 120000 },
          { name: 'Transport', prob: 0.3, min: 15000, max: 80000 },
          { name: 'Lainnya', prob: 0.15, min: 20000, max: 100000 },
        ],
        income: Array.from({ length: 30 }, () => 0), // diisi acak di builder
      }
    default: // keluarga
      return {
        masuk: 'Pemasukan', keluar: 'Pengeluaran', saldo: 'Saldo',
        cats: [
          { name: 'Makan', prob: 1, min: 15000, max: 90000 },
          { name: 'Transport', prob: 0.7, min: 10000, max: 60000 },
          { name: 'Tagihan', prob: 0.15, min: 150000, max: 500000 },
          { name: 'Belanja', prob: 0.3, min: 50000, max: 200000 },
          { name: 'Lainnya', prob: 0.25, min: 20000, max: 120000 },
        ],
        income: (() => { const a = new Array(30).fill(0); a[0] = 10000000; a[14] = 750000; return a })(),
      }
  }
}

function buildDemo(slug: string, spec: Spec): { chart: ChartData; pemasukan: number; pengeluaran: number; saldo: number } {
  let s = 20260714 >>> 0
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
  const rnd = (a: number, b: number) => Math.round((a + rng() * (b - a)) / 1000) * 1000
  const DAYS = 30

  const cats = spec.cats.map((c) => c.name)
  const catDay: Record<string, number[]> = Object.fromEntries(cats.map((c) => [c, new Array(DAYS).fill(0)]))
  const outDay: number[] = [], inDay: number[] = [], sisa: number[] = []
  let run = 0

  for (let i = 0; i < DAYS; i++) {
    for (const c of spec.cats) catDay[c.name][i] = rng() < c.prob ? rnd(c.min, c.max) : 0
    const masuk = slug === 'umkm' ? rnd(150000, 600000) : spec.income[i]
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

export default async function DemoScopePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const uc = USE_CASES.find((u) => u.slug === slug)
  if (!uc) notFound()

  const spec = specFor(slug)
  const { chart, pemasukan, pengeluaran, saldo } = buildDemo(slug, spec)

  return (
    <>
      <MarketingNav />
      <main style={wrap}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Demo Laporan · data contoh</div>
        <h1 style={{ fontSize: 22, margin: '2px 0 0' }}>
          {uc.icon} {uc.title}
        </h1>
        <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{uc.tagline}</div>

        <div style={{ ...cardsRow, marginTop: 16 }}>
          <div style={statCard}><div style={statLabel}>{spec.masuk}</div><div style={{ ...statBig, color: '#16a34a' }}>{rupiah(pemasukan)}</div></div>
          <div style={statCard}><div style={statLabel}>{spec.keluar}</div><div style={{ ...statBig, color: '#dc2626' }}>{rupiah(pengeluaran)}</div></div>
        </div>
        <div style={cardsRow}>
          <div style={statCard}><div style={statLabel}>{spec.saldo}</div><div style={{ ...statBig, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{rupiah(saldo)}</div></div>
          {spec.roster && (
            <div style={statCard}><div style={statLabel}>Sudah bayar iuran</div><div style={statBig}>{spec.roster.paid}<span style={{ color: 'var(--muted)', fontSize: 15 }}> / {spec.roster.total}</span></div></div>
          )}
        </div>

        <ReportCharts chart={chart} />

        {spec.roster && (
          <>
            <h2 style={{ fontSize: 16, margin: '26px 0 10px' }}>Status Iuran (contoh)</h2>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead><tr><th style={th}>Nama</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Nominal</th></tr></thead>
                  <tbody>
                    {NAMES.slice(0, spec.roster.total).map((nama, i) => {
                      const lunas = i < spec.roster!.paid
                      return (
                        <tr key={nama}>
                          <td style={td}>{nama}</td>
                          <td style={td}>{lunas ? <span style={badgeOn}>✓ Lunas</span> : <span style={badgeOff}>Belum</span>}</td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{lunas ? rupiah(spec.roster!.nominal) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/daftar" style={cta}>Mau laporan seperti ini? Daftar →</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Link href="/#cocok-untuk" style={{ color: 'var(--muted)', fontSize: 13 }}>← Lihat contoh lain</Link>
        </div>
      </main>
    </>
  )
}

const wrap: React.CSSProperties = { fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto', padding: '28px 18px 48px', color: 'var(--text)', minHeight: '100vh' }
const cardsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }
const statCard: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', background: 'var(--surface)' }
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 6 }
const statBig: React.CSSProperties = { fontSize: 19, fontWeight: 700 }
const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', background: 'var(--track)', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }
const td: React.CSSProperties = { padding: '9px 12px', borderTop: '1px solid var(--border)' }
const badgeOn: React.CSSProperties = { background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }
const badgeOff: React.CSSProperties = { background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }
const cta: React.CSSProperties = { display: 'inline-block', background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }
