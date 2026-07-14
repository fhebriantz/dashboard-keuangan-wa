import { createAdminClient } from '@/lib/supabase/admin'
import { wibMonthStartISO, formatTanggalWIB, namaBulanWIB } from '@/lib/time'
import { monthlyData, buildChartData } from '@/lib/report-data'
import { emojiOf } from '@/lib/category'
import ReportCharts from './ReportCharts'
import ThemeToggle from './ThemeToggle'

export const dynamic = 'force-dynamic'

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

const THEME_INIT = `(function(){try{var t=localStorage.getItem('laporan-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`
const THEME_CSS = `
:root{--bg:#f8fafc;--surface:#ffffff;--text:#18181b;--muted:#71717a;--border:#e4e4e7;--track:#f1f5f9}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1220;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--track:#1e293b}}
:root[data-theme="dark"]{--bg:#0b1220;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--track:#1e293b}
body{background:var(--bg)}
`

export default async function LaporanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, nama_keluarga, status_langganan')
    .eq('id', id)
    .maybeSingle()

  if (!family) {
    return (
      <main style={wrap}>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
          Laporan tidak ditemukan. Periksa kembali link-nya.
        </p>
      </main>
    )
  }

  const monthStart = wibMonthStartISO()
  const [data, { data: logs }] = await Promise.all([
    monthlyData(supabase, id, monthStart),
    supabase
      .from('budget_logs')
      .select('kategori, aksi, nominal_lama, nominal_baru, created_at')
      .eq('family_id', id)
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const { pemasukan, pengeluaran, saldo, categories, rows, totalBudget } = data
  const sisaTotal = totalBudget != null ? totalBudget - pengeluaran : null
  const chart = buildChartData(rows)
  const riwayat = logs ?? []

  const aksiLabel = (a: string) =>
    a === 'set' ? 'diatur' : a === 'pindah_masuk' ? '+ pindah masuk' : '− pindah keluar'

  return (
    <main style={wrap}>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4, color: 'var(--muted)', fontSize: 13 }}>
            Laporan Keuangan · {namaBulanWIB()}
          </div>
          <h1 style={{ fontSize: 22, margin: 0 }}>{family.nama_keluarga}</h1>
        </div>
        <ThemeToggle />
      </div>

      <div style={{ ...cardsRow, marginTop: 16 }}>
        <div style={statCard}>
          <div style={statLabel}>Pemasukan</div>
          <div style={{ ...statBig, color: '#16a34a' }}>{rupiah(pemasukan)}</div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>Pengeluaran</div>
          <div style={{ ...statBig, color: '#dc2626' }}>{rupiah(pengeluaran)}</div>
        </div>
      </div>
      <div style={cardsRow}>
        <div style={statCard}>
          <div style={statLabel}>Saldo (pemasukan - pengeluaran)</div>
          <div style={{ ...statBig, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{rupiah(saldo)}</div>
        </div>
        {totalBudget != null && (
          <div style={statCard}>
            <div style={statLabel}>Sisa total amplop</div>
            <div style={{ ...statBig, color: (sisaTotal ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
              {rupiah(sisaTotal ?? 0)}
            </div>
          </div>
        )}
      </div>

      {/* Grafik */}
      <ReportCharts chart={chart} />

      {/* Amplop per kategori */}
      {categories.length > 0 && (
        <>
          <h2 style={sectionH2}>Anggaran per Kategori</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {categories.map((c) => {
              const persen = c.budget && c.budget > 0 ? Math.min(100, (c.spent / c.budget) * 100) : 0
              const sisa = c.budget != null ? c.budget - c.spent : null
              const warna = persen >= 100 ? '#dc2626' : persen >= 80 ? '#f59e0b' : '#16a34a'
              return (
                <div key={c.kategori}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>
                      {emojiOf(c.kategori)} {c.kategori}
                    </span>
                    <span>
                      {rupiah(c.spent)}
                      {c.budget != null && <span style={{ color: 'var(--muted)' }}> / {rupiah(c.budget)}</span>}
                    </span>
                  </div>
                  {c.budget != null ? (
                    <>
                      <div style={barTrack}>
                        <div style={{ ...barFill, width: `${persen}%`, background: warna }} />
                      </div>
                      <div style={{ fontSize: 12, color: (sisa ?? 0) >= 0 ? 'var(--muted)' : '#dc2626', marginTop: 3 }}>
                        {(sisa ?? 0) >= 0 ? `Sisa ${rupiah(sisa ?? 0)}` : `⚠️ Lewat ${rupiah(-(sisa ?? 0))}`}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Belum ada anggaran</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Riwayat perubahan amplop */}
      {riwayat.length > 0 && (
        <>
          <h2 style={sectionH2}>Riwayat Amplop</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {riwayat.map((r, i) => (
              <div key={i} style={{ ...logRow }}>
                <span>
                  {emojiOf(r.kategori)} <b>{r.kategori}</b> {aksiLabel(r.aksi)}
                  <span style={{ color: 'var(--muted)' }}>
                    {' · '}
                    {r.nominal_lama != null ? rupiah(Number(r.nominal_lama)) + ' → ' : ''}
                    {rupiah(Number(r.nominal_baru))}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatTanggalWIB(r.created_at)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rincian */}
      <h2 style={sectionH2}>Rincian ({rows.length} transaksi)</h2>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Belum ada transaksi bulan ini.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r, i) => {
            const masuk = r.tipe === 'pemasukan'
            return (
              <li key={i} style={txItem}>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.nama_pengeluaran}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatTanggalWIB(r.created_at)} · {masuk ? 'pemasukan' : r.kategori || 'Lainnya'}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: masuk ? '#16a34a' : '#dc2626' }}>
                  {masuk ? '+' : '−'} {rupiah(Number(r.nominal))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 32 }}>
        Dashboard Keuangan WA
      </p>
    </main>
  )
}

/* ---------- styles (pakai CSS variables agar dark/light) ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 520,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: 'var(--text)',
  minHeight: '100vh',
}
const cardsRow: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 }
const statCard: React.CSSProperties = {
  flex: 1,
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '14px 16px',
  background: 'var(--surface)',
}
const statLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 6 }
const statBig: React.CSSProperties = { fontSize: 19, fontWeight: 700 }
const sectionH2: React.CSSProperties = { fontSize: 15, color: 'var(--muted)', margin: '26px 0 12px' }
const barTrack: React.CSSProperties = {
  height: 8,
  background: 'var(--track)',
  borderRadius: 999,
  overflow: 'hidden',
  marginTop: 6,
}
const barFill: React.CSSProperties = { height: '100%', borderRadius: 999 }
const txItem: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 4px',
  borderBottom: '1px solid var(--border)',
}
const logRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  background: 'var(--track)',
  borderRadius: 8,
  padding: '9px 12px',
}
