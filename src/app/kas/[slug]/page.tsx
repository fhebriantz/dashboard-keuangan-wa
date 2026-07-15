import { createAdminClient } from '@/lib/supabase/admin'
import { wibMonthStartISO, namaBulanWIB, wibPeriode, namaPeriode, formatTanggalWIB } from '@/lib/time'
import { monthlyData, buildChartData } from '@/lib/report-data'
import ReportCharts from '../../laporan/[id]/ReportCharts'
import ThemeToggle from '../../laporan/[id]/ThemeToggle'

export const dynamic = 'force-dynamic'

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

const THEME_INIT = `(function(){try{var t=localStorage.getItem('laporan-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`
const THEME_CSS = `
:root{--bg:#f8fafc;--surface:#ffffff;--text:#18181b;--muted:#71717a;--border:#e4e4e7;--track:#f1f5f9}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1220;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--track:#1e293b}}
:root[data-theme="dark"]{--bg:#0b1220;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--track:#1e293b}
body{background:var(--bg)}
`

export default async function KasPublikPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, nama_keluarga, mode, laporan_publik')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!family) {
    return (
      <main style={wrap}>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
          Laporan kas tidak ditemukan. Periksa kembali link-nya.
        </p>
      </main>
    )
  }

  if (family.laporan_publik === false) {
    return (
      <main style={wrap}>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
          🔒 Laporan kas ini sedang ditutup oleh bendahara.
        </p>
      </main>
    )
  }

  const periode = wibPeriode()
  const [data, { data: roster }, { data: bayar }] = await Promise.all([
    monthlyData(supabase, family.id, wibMonthStartISO()),
    supabase.from('iuran_anggota').select('id, nama').eq('family_id', family.id).eq('aktif', true).order('nama'),
    supabase
      .from('iuran_pembayaran')
      .select('anggota_id, nominal, created_at')
      .eq('family_id', family.id)
      .eq('periode', periode),
  ])

  const { pemasukan, pengeluaran, saldo, rows } = data
  const chart = buildChartData(rows)

  const paidMap = new Map(
    (bayar ?? []).map((b) => [b.anggota_id as string, b as { nominal: number; created_at: string }]),
  )
  const anggota = roster ?? []
  const sudahCount = anggota.filter((a) => paidMap.has(a.id)).length

  return (
    <main style={wrap}>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4, color: 'var(--muted)', fontSize: 13 }}>
            Laporan Kas · {namaBulanWIB()}
          </div>
          <h1 style={{ fontSize: 22, margin: 0 }}>{family.nama_keluarga}</h1>
        </div>
        <ThemeToggle />
      </div>

      <div style={{ ...cardsRow, marginTop: 16 }}>
        <div style={statCard}>
          <div style={statLabel}>Iuran masuk</div>
          <div style={{ ...statBig, color: '#16a34a' }}>{rupiah(pemasukan)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Pengeluaran kas</div>
          <div style={{ ...statBig, color: '#dc2626' }}>{rupiah(pengeluaran)}</div>
        </div>
      </div>
      <div style={cardsRow}>
        <div style={statCard}>
          <div style={statLabel}>Saldo kas</div>
          <div style={{ ...statBig, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{rupiah(saldo)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Sudah bayar iuran {namaPeriode(periode)}</div>
          <div style={statBig}>
            {sudahCount}<span style={{ color: 'var(--muted)', fontSize: 18 }}> / {anggota.length}</span>
          </div>
        </div>
      </div>

      <ReportCharts chart={chart} />

      {anggota.length > 0 && (
        <>
          <h2 style={sectionH2}>Status Iuran · {namaPeriode(periode)}</h2>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={th}>Nama</th>
                    <th style={th}>Status</th>
                    <th style={th}>Tanggal</th>
                    <th style={{ ...th, textAlign: 'right' }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {anggota.map((a) => {
                    const p = paidMap.get(a.id)
                    return (
                      <tr key={a.id}>
                        <td style={td}>{a.nama}</td>
                        <td style={td}>
                          {p ? (
                            <span style={badgeOn}>✓ Lunas</span>
                          ) : (
                            <span style={badgeOff}>Belum</span>
                          )}
                        </td>
                        <td style={{ ...td, color: 'var(--muted)' }}>
                          {p ? formatTanggalWIB(p.created_at) : '—'}
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {p ? rupiah(Number(p.nominal)) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 32 }}>
        Laporan transparan · diperbarui otomatis · Dashboard Keuangan WA
      </p>
    </main>
  )
}

/* ---------- styles ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 720,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: 'var(--text)',
  minHeight: '100vh',
}
const cardsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }
const statCard: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'var(--surface)',
}
const statLabel: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)' }
const statBig: React.CSSProperties = { fontSize: 22, fontWeight: 800, marginTop: 4 }
const sectionH2: React.CSSProperties = { fontSize: 16, margin: '26px 0 10px' }
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '9px 12px',
  background: 'var(--track)',
  fontSize: 12,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}
const td: React.CSSProperties = { padding: '9px 12px', borderTop: '1px solid var(--border)' }
const badgeOn: React.CSSProperties = {
  background: '#dcfce7',
  color: '#166534',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
}
const badgeOff: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
}
