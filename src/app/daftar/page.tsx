import { submitRegistration } from './actions'
import { PAKET, REKENING, getPaket, rupiah } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<{ sukses?: string; paket?: string; err?: string }>
}) {
  const sp = await searchParams

  // ---------- Tampilan sukses + info pembayaran ----------
  if (sp.sukses) {
    const paket = getPaket(sp.paket ?? '')
    return (
      <main style={wrap}>
        <div style={{ textAlign: 'center', fontSize: 40 }}>🎉</div>
        <h1 style={{ fontSize: 22, textAlign: 'center', marginTop: 8 }}>
          Pendaftaran diterima!
        </h1>
        <div style={card}>
          <h2 style={h2}>Langkah pembayaran</h2>
          {paket && (
            <p style={{ margin: '8px 0' }}>
              Paket <b>{paket.label}</b> — <b>{rupiah(paket.harga)}</b>
            </p>
          )}
          <p style={{ margin: '8px 0' }}>Transfer ke:</p>
          <div style={rekBox}>
            <div>
              <b>
                {REKENING.bank} {REKENING.nomor}
              </b>
            </div>
            <div>a.n. {REKENING.atasNama}</div>
          </div>
          <p style={{ marginTop: 14, fontSize: 14 }}>
            Setelah transfer, <b>kirim bukti transfer via WhatsApp ke nomor bot</b>.
            Admin akan mengaktifkan langganan kamu (biasanya beberapa jam).
          </p>
        </div>
        <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 12, marginTop: 24 }}>
          Dashboard Keuangan WA
        </p>
      </main>
    )
  }

  // ---------- Form pendaftaran ----------
  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Daftar Langganan</h1>
      <p style={{ color: '#71717a', fontSize: 14, marginTop: 6 }}>
        Catat keuangan keluarga cukup lewat chat WhatsApp. Isi form ini ±1 menit.
      </p>

      {sp.err && <p style={errBox}>⚠️ {sp.err}</p>}

      <form action={submitRegistration} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        <label style={lab}>
          Nama keluarga *
          <input name="nama_keluarga" required placeholder="cth: Keluarga Budi" style={inp} />
        </label>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Suami</div>
          <label style={lab}>
            Nama
            <input name="nama_suami" placeholder="cth: Budi" style={inp} />
          </label>
          <label style={{ ...lab, marginTop: 10 }}>
            Nomor WhatsApp
            <input name="wa_suami" placeholder="08123456789" style={inp} />
          </label>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Istri</div>
          <label style={lab}>
            Nama
            <input name="nama_istri" placeholder="cth: Ani" style={inp} />
          </label>
          <label style={{ ...lab, marginTop: 10 }}>
            Nomor WhatsApp
            <input name="wa_istri" placeholder="08123456789" style={inp} />
          </label>
        </div>

        <p style={{ fontSize: 13, color: '#71717a', margin: 0 }}>
          *Isi minimal satu nomor WA. Nomor inilah yang nanti dipakai chat ke bot.
        </p>

        <label style={lab}>
          Pilih paket *
          <select name="paket" required defaultValue={PAKET[0]?.id} style={inp}>
            {PAKET.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {rupiah(p.harga)}
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
const card: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  padding: 16,
}
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
