import { createAdminClient } from '@/lib/supabase/admin'
import { wibMonthStartISO, formatTanggalWIB, namaBulanWIB } from '@/lib/time'
import { monthlyData } from '@/lib/report-data'
import { emojiOf } from '@/lib/category'

export const dynamic = 'force-dynamic'

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

/**
 * Laporan read-only per keluarga (buka di HP). Diakses lewat link berisi
 * family_id (UUID, tidak bisa ditebak). Pakai service_role di server dan
 * HANYA menampilkan data keluarga pada id tsb.
 */
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
        <p style={{ textAlign: 'center', color: '#71717a' }}>
          Laporan tidak ditemukan. Periksa kembali link-nya.
        </p>
      </main>
    )
  }

  const data = await monthlyData(supabase, id, wibMonthStartISO())
  const { pemasukan, pengeluaran, saldo, categories, rows, totalBudget } = data
  const sisaTotal = totalBudget != null ? totalBudget - pengeluaran : null

  return (
    <main style={wrap}>
      <div style={{ marginBottom: 4, color: '#71717a', fontSize: 13 }}>
        Laporan Keuangan · {namaBulanWIB()}
      </div>
      <h1 style={{ fontSize: 22, margin: '0 0 16px' }}>{family.nama_keluarga}</h1>

      <div style={cardsRow}>
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
          <div style={{ ...statBig, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>
            {rupiah(saldo)}
          </div>
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

      {/* ---------- Amplop per kategori ---------- */}
      {categories.length > 0 && (
        <>
          <h2 style={sectionH2}>Anggaran per Kategori</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {categories.map((c) => {
              const persen =
                c.budget && c.budget > 0 ? Math.min(100, (c.spent / c.budget) * 100) : 0
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
                      {c.budget != null && (
                        <span style={{ color: '#a1a1aa' }}> / {rupiah(c.budget)}</span>
                      )}
                    </span>
                  </div>
                  {c.budget != null ? (
                    <>
                      <div style={barTrack}>
                        <div style={{ ...barFill, width: `${persen}%`, background: warna }} />
                      </div>
                      <div style={{ fontSize: 12, color: (sisa ?? 0) >= 0 ? '#71717a' : '#dc2626', marginTop: 3 }}>
                        {(sisa ?? 0) >= 0
                          ? `Sisa ${rupiah(sisa ?? 0)}`
                          : `⚠️ Lewat ${rupiah(-(sisa ?? 0))}`}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 3 }}>
                      Belum ada anggaran
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ---------- Rincian ---------- */}
      <h2 style={sectionH2}>Rincian ({rows.length} transaksi)</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#71717a', fontSize: 14 }}>Belum ada transaksi bulan ini.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r, i) => {
            const masuk = r.tipe === 'pemasukan'
            return (
              <li key={i} style={txItem}>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.nama_pengeluaran}</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                    {formatTanggalWIB(r.created_at)} ·{' '}
                    {masuk ? 'pemasukan' : r.kategori || 'Lainnya'}
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

      <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 12, marginTop: 32 }}>
        Dashboard Keuangan WA
      </p>
    </main>
  )
}

/* ---------- styles (mobile-first) ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 480,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: '#18181b',
}
const cardsRow: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 }
const statCard: React.CSSProperties = {
  flex: 1,
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  padding: '14px 16px',
}
const statLabel: React.CSSProperties = { fontSize: 12, color: '#71717a', marginBottom: 6 }
const statBig: React.CSSProperties = { fontSize: 19, fontWeight: 700 }
const sectionH2: React.CSSProperties = {
  fontSize: 15,
  color: '#52525b',
  margin: '26px 0 12px',
}
const barTrack: React.CSSProperties = {
  height: 8,
  background: '#f4f4f5',
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
  borderBottom: '1px solid #f4f4f5',
}
