import { createAdminClient } from '@/lib/supabase/admin'
import { getPackages, getPricingConfig, getPackage, hitungTotal, rupiah } from '@/lib/pricing'
import MarketingNav from '../MarketingNav'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ sukses?: string; err?: string }>
}) {
  const sp = await searchParams
  const supabase = createAdminClient()

  // ---------- Tampilan sukses + info pembayaran ----------
  if (sp.sukses) {
    const [{ data: reg }, config] = await Promise.all([
      supabase
        .from('registrations')
        .select('nama_keluarga, paket, members')
        .eq('id', sp.sukses)
        .maybeSingle(),
      getPricingConfig(supabase),
    ])
    const pkg = reg ? await getPackage(supabase, reg.paket) : null
    const jumlah = Array.isArray(reg?.members) ? reg!.members.length : 0
    const bulan = pkg?.bulan ?? 1
    const total = hitungTotal(config, jumlah, bulan)

    return (
      <>
        <MarketingNav />
        <main style={wrap}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🎉</div>
        <h1 style={{ fontSize: 22, textAlign: 'center', marginTop: 8 }}>
          Pendaftaran diterima!
        </h1>
        <div style={card}>
          <h2 style={h2}>Rincian pembayaran</h2>
          <div style={{ fontSize: 14, margin: '10px 0', lineHeight: 1.8 }}>
            Paket: <b>{pkg?.label ?? '-'}</b>
            <br />
            {rupiah(config.harga_keluarga)} (grup) + {jumlah} anggota ×{' '}
            {rupiah(config.harga_anggota)} × {bulan} bulan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 14px' }}>
            Total: {rupiah(total)}
          </div>
          <p style={{ margin: '8px 0', fontSize: 14 }}>Transfer ke:</p>
          <div style={rekBox}>
            <b>
              {config.bank} {config.rekening}
            </b>
            <div>a.n. {config.atas_nama}</div>
          </div>
          <p style={{ marginTop: 14, fontSize: 14 }}>
            Setelah transfer, <b>kirim bukti transfer via WhatsApp ke nomor bot</b>.
            Admin akan mengaktifkan langganan kamu.
          </p>
        </div>
        </main>
      </>
    )
  }

  // ---------- Form pendaftaran ----------
  const [packages, config] = await Promise.all([
    getPackages(supabase),
    getPricingConfig(supabase),
  ])

  return (
    <>
      <MarketingNav />
      <main style={wrap}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Daftar Langganan</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
        Catat keuangan bersama pasangan, keluarga, atau tim — cukup lewat chat WhatsApp.
      </p>
      <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
        {rupiah(config.harga_keluarga)}/grup + {rupiah(config.harga_anggota)}/anggota per bulan
      </p>

      {sp.err && <p style={errBox}>⚠️ {sp.err}</p>}

      <RegisterForm config={config} packages={packages} />
      </main>
    </>
  )
}

/* ---------- styles ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 460,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: 'var(--text)',
  minHeight: '100vh',
}
const card: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)' }
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 4px' }
const rekBox: React.CSSProperties = {
  background: 'var(--track)',
  borderRadius: 8,
  padding: '12px 14px',
  fontSize: 15,
}
const errBox: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #dc2626',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
  marginTop: 12,
}
