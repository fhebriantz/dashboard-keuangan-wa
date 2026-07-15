import Link from 'next/link'
import MarketingNav from '../MarketingNav'
import { USE_CASES } from '@/lib/use-cases'

export const dynamic = 'force-static'

export const metadata = { title: 'Demo Laporan — Dashboard Keuangan WA' }

// Galeri demo: satu kartu per kebutuhan, tiap kartu membuka demo laporan
// yang sesuai (/demo/<slug>). Data pada tiap demo hanya contoh (bukan data asli).
export default function DemoPage() {
  return (
    <>
      <MarketingNav />
      <main style={wrap}>
        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>Demo Laporan</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Pilih kebutuhanmu untuk melihat contoh laporan yang sesuai. Semua data di bawah hanya contoh.
        </p>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: 20 }}>
          {USE_CASES.map((u) => (
            <Link key={u.slug} href={`/demo/${u.slug}`} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{u.icon}</span>
                <span style={{ fontWeight: 700 }}>{u.title}</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{u.tagline}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13, marginTop: 10 }}>
                Lihat demo →
              </div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/daftar" style={cta}>Mau punya laporan seperti ini? Daftar →</Link>
        </div>
      </main>
    </>
  )
}

const wrap: React.CSSProperties = { fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '0 auto', padding: '28px 18px 48px', color: 'var(--text)', minHeight: '100vh' }
const card: React.CSSProperties = {
  display: 'block',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 18,
  background: 'var(--surface)',
  textDecoration: 'none',
  color: 'var(--text)',
}
const cta: React.CSSProperties = { display: 'inline-block', background: '#16a34a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }
