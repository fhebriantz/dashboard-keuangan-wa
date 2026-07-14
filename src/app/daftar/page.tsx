import { submitRegistration } from './actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPackages, getPricingConfig, getPackage, hitungTotal, rupiah } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const SLOTS = 5

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
    )
  }

  // ---------- Form pendaftaran ----------
  const [packages, config] = await Promise.all([
    getPackages(supabase),
    getPricingConfig(supabase),
  ])

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Daftar Langganan</h1>
      <p style={{ color: '#71717a', fontSize: 14, marginTop: 6 }}>
        Catat keuangan bersama pasangan, keluarga, atau tim — cukup lewat chat WhatsApp.
      </p>
      <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
        {rupiah(config.harga_keluarga)}/grup + {rupiah(config.harga_anggota)}/anggota per bulan
      </p>

      {sp.err && <p style={errBox}>⚠️ {sp.err}</p>}

      <form action={submitRegistration} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
        <label style={lab}>
          Nama grup / keluarga *
          <input name="nama_keluarga" required placeholder="cth: Keluarga Budi" style={inp} />
        </label>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Anggota</div>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 0 }}>
            Isi minimal satu. Nomor inilah yang dipakai chat ke bot.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: SLOTS }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input
                  name={`m_nama_${i}`}
                  placeholder={`Nama anggota ${i + 1}`}
                  style={{ ...inp, flex: 1 }}
                />
                <input
                  name={`m_wa_${i}`}
                  placeholder="08123..."
                  style={{ ...inp, flex: 1 }}
                />
              </div>
            ))}
          </div>
        </div>

        <label style={lab}>
          Pilih paket durasi *
          <select name="paket" required defaultValue={packages[0]?.id} style={inp}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" style={btn}>
          Daftar Sekarang
        </button>
      </form>
    </main>
  )
}

/* ---------- styles ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 460,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: '#18181b',
}
const card: React.CSSProperties = { border: '1px solid #e4e4e7', borderRadius: 12, padding: 16 }
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 4px' }
const lab: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 14, fontWeight: 500 }
const inp: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #d4d4d8',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 400,
}
const btn: React.CSSProperties = {
  padding: '12px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
}
const rekBox: React.CSSProperties = {
  background: '#f4f4f5',
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
