import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPricingConfig, getPackages, rupiah, hitungTotal, type PricingConfig, type Package } from '@/lib/pricing'
import MarketingNav from './MarketingNav'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard Keuangan WA — Catat keuangan keluarga lewat WhatsApp',
  description: 'Catat pemasukan & pengeluaran keluarga cukup dengan chat WhatsApp. Kategori otomatis, sistem amplop, dan laporan lengkap.',
}

const FITUR = [
  { icon: '💬', title: 'Catat lewat chat', desc: 'Ketik "Bensin 50rb" ke WhatsApp — langsung tercatat. Tanpa install aplikasi.' },
  { icon: '🏷️', title: 'Kategori otomatis', desc: 'Pengeluaran dikelompokkan sendiri, dan bot belajar dari kebiasaanmu.' },
  { icon: '✉️', title: 'Sistem amplop', desc: 'Bagi jatah per kategori (Makan, Transport, dll) dan pantau sisanya real-time.' },
  { icon: '📊', title: 'Laporan & grafik', desc: 'Tren harian, komposisi pengeluaran, dan kondisi amplop dalam grafik rapi.' },
  { icon: '🧮', title: 'Pemasukan & saldo', desc: 'Catat gaji/pemasukan, lihat saldo riil dan sisa anggaran kapan saja.' },
  { icon: '📷', title: 'Scan struk', desc: 'Kirim foto struk belanja — total & kategori otomatis terbaca dan tercatat.' },
  { icon: '🗣️', title: 'Ngerti bahasa santai', desc: 'Ketik apa adanya, bahkan kalimat panjang — bot tetap paham maksudmu.' },
  { icon: '👨‍👩‍👧', title: 'Bareng pasangan/tim', desc: 'Suami, istri, atau anggota lain mencatat dari HP masing-masing ke satu akun.' },
]

const LANGKAH = [
  { n: '1', title: 'Daftar', desc: 'Isi form pendaftaran, pilih paket, lakukan pembayaran.' },
  { n: '2', title: 'Chat ke bot', desc: 'Kirim pengeluaran/pemasukan ke nomor bot WhatsApp.' },
  { n: '3', title: 'Pantau laporan', desc: 'Ketik "laporan" atau buka halaman laporan web kapan saja.' },
]

async function loadPricing(): Promise<{ config: PricingConfig; packages: Package[] }> {
  try {
    const supabase = createAdminClient()
    const [config, packages] = await Promise.all([getPricingConfig(supabase), getPackages(supabase)])
    return { config, packages }
  } catch {
    return {
      config: { harga_keluarga: 15000, harga_anggota: 5000, bank: '-', rekening: '-', atas_nama: '-' },
      packages: [],
    }
  }
}

export default async function LandingPage() {
  const { config, packages } = await loadPricing()
  const contoh = hitungTotal(config, 2, 1) // 2 anggota, 1 bulan

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text)', minHeight: '100vh' }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ ...container, padding: '40px 20px 20px', display: 'grid', gap: 40, gridTemplateColumns: '1fr', alignItems: 'center' }}>
        <div>
          <div style={pill}>✨ Keuangan keluarga jadi gampang</div>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: '16px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Catat keuangan keluarga{' '}
            <span style={{ background: 'linear-gradient(90deg,var(--accent),var(--accent2))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              cukup lewat WhatsApp
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 560, margin: 0 }}>
            Tanpa install aplikasi. Ketik pengeluaranmu ke chat, bot mencatat, mengategorikan,
            dan menyusun laporan lengkap — untuk kamu dan pasangan.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
            <Link href="/daftar" style={btnPrimary}>Daftar Sekarang</Link>
            <Link href="/demo" style={btnGhost}>Lihat Demo Laporan →</Link>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)' }}>
            Mulai {rupiah(config.harga_keluarga)}/grup + {rupiah(config.harga_anggota)}/anggota per bulan
          </div>
        </div>

        {/* Chat mockup */}
        <div style={chatMock}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>WhatsApp · Bot Keuangan</div>
          <Bubble side="right" text="Bensin 50rb" />
          <Bubble side="left" text={'✅ Tercatat\n🚗 Transport · Rp 50.000\n📊 Sisa amplop Transport: Rp 450.000'} />
          <Bubble side="right" text="masuk gaji 10jt" />
          <Bubble side="left" text={'✅ Pemasukan tercatat\n💵 Rp 10.000.000'} />
          <Bubble side="right" text="📷 [foto struk]" />
          <Bubble side="left" text={'✅ Struk terbaca\n🛒 Indomaret · Rp 87.500'} />
          <Bubble side="right" text="laporan" />
          <Bubble side="left" text={'📋 Rekap bulan ini + 🔗 link laporan web'} />
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" style={{ ...container, padding: '50px 20px' }}>
        <h2 style={sectionTitle}>Semua yang keluarga butuhkan</h2>
        <p style={sectionSub}>Fitur lengkap, tapi dipakainya cukup dari chat.</p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: 28 }}>
          {FITUR.map((f) => (
            <div key={f.title} style={featureCard}>
              <div style={{ fontSize: 28 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, marginTop: 10 }}>{f.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Cara pakai */}
      <section style={{ ...container, padding: '20px 20px 50px' }}>
        <h2 style={sectionTitle}>Mulai dalam 3 langkah</h2>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 28 }}>
          {LANGKAH.map((s) => (
            <div key={s.n} style={featureCard}>
              <div style={stepNum}>{s.n}</div>
              <div style={{ fontWeight: 700, marginTop: 12 }}>{s.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Harga */}
      <section id="harga" style={{ ...container, padding: '30px 20px 60px' }}>
        <h2 style={sectionTitle}>Harga sederhana</h2>
        <p style={sectionSub}>Bayar sesuai jumlah anggota & durasi. Tanpa biaya tersembunyi.</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <div style={priceCard}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 40, fontWeight: 800 }}>{rupiah(config.harga_keluarga)}</span>
              <span style={{ color: 'var(--muted)' }}>/ grup / bulan</span>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 4 }}>
              + {rupiah(config.harga_anggota)} per anggota / bulan
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '18px 0', paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Contoh: keluarga 2 anggota, 1 bulan</div>
              <div style={{ fontWeight: 700, fontSize: 22 }}>{rupiah(contoh)} <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--muted)' }}>/ bulan</span></div>
            </div>

            {packages.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Pilihan durasi</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {packages.map((p) => (
                    <span key={p.id} style={chip}>{p.label}</span>
                  ))}
                </div>
              </div>
            )}

            <Link href="/daftar" style={{ ...btnPrimary, display: 'block', textAlign: 'center' }}>Daftar Sekarang</Link>
          </div>
        </div>
      </section>

      {/* CTA + footer */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--soft)' }}>
        <div style={{ ...container, padding: '40px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Siap rapikan keuangan keluarga?</h2>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Daftar sekarang, mulai catat hari ini.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <Link href="/daftar" style={btnPrimary}>Daftar</Link>
            <Link href="/panduan" style={btnGhost}>Baca Panduan</Link>
            <Link href="/demo" style={btnGhost}>Lihat Demo</Link>
          </div>
          <div style={{ marginTop: 26, fontSize: 13, color: 'var(--muted)' }}>
            © {namaTahun()} Dashboard Keuangan WA
          </div>
        </div>
      </footer>
    </div>
  )
}

function namaTahun() {
  return new Date().getFullYear()
}

function Bubble({ side, text }: { side: 'left' | 'right'; text: string }) {
  const right = side === 'right'
  return (
    <div style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div
        style={{
          maxWidth: '80%',
          whiteSpace: 'pre-wrap',
          fontSize: 13.5,
          lineHeight: 1.4,
          padding: '9px 12px',
          borderRadius: 14,
          borderBottomRightRadius: right ? 4 : 14,
          borderBottomLeftRadius: right ? 14 : 4,
          background: right ? 'var(--accent)' : 'var(--soft)',
          color: right ? '#fff' : 'var(--text)',
          border: right ? 'none' : '1px solid var(--border)',
        }}
      >
        {text}
      </div>
    </div>
  )
}

/* ---------- styles ---------- */
const container: React.CSSProperties = { maxWidth: 1040, margin: '0 auto', width: '100%' }
const pill: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--soft)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 13,
  color: 'var(--muted)',
}
const btnPrimary: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  padding: '12px 20px',
  borderRadius: 10,
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: 15,
}
const btnGhost: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text)',
  padding: '12px 20px',
  borderRadius: 10,
  fontWeight: 600,
  textDecoration: 'none',
  fontSize: 15,
  border: '1px solid var(--border)',
}
const chatMock: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 20px 50px -20px rgba(0,0,0,.25)',
  maxWidth: 420,
  width: '100%',
  justifySelf: 'center',
}
const sectionTitle: React.CSSProperties = { fontSize: 28, fontWeight: 800, textAlign: 'center', margin: 0, letterSpacing: '-0.02em' }
const sectionSub: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', marginTop: 8 }
const featureCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 20,
}
const stepNum: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: 40,
  width: 40,
  borderRadius: 12,
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 18,
}
const priceCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '2px solid var(--accent)',
  borderRadius: 20,
  padding: 28,
  maxWidth: 380,
  width: '100%',
}
const chip: React.CSSProperties = {
  background: 'var(--soft)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 13,
  fontWeight: 600,
}
