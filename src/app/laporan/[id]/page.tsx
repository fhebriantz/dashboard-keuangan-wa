import { createAdminClient } from '@/lib/supabase/admin'
import { wibMonthStartISO, formatTanggalWIB, namaBulanWIB } from '@/lib/time'

export const dynamic = 'force-dynamic'

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

/**
 * Laporan read-only per keluarga. Diakses lewat link berisi family_id
 * (UUID, tidak bisa ditebak). Untuk produksi, bisa diganti token khusus
 * yang bisa dicabut. Halaman ini pakai service_role di server dan HANYA
 * menampilkan data keluarga pada id tsb — data keluarga lain tak ikut.
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
    .select('id, nama_keluarga, status_langganan, anggaran_bulanan')
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

  const monthStart = wibMonthStartISO()
  const { data: txs } = await supabase
    .from('transactions')
    .select('nama_pengeluaran, nominal, created_at, tipe')
    .eq('family_id', id)
    .gte('created_at', monthStart)
    .order('created_at', { ascending: false })

  const rows = txs ?? []
  const pemasukan = rows
    .filter((r) => r.tipe === 'pemasukan')
    .reduce((s, r) => s + Number(r.nominal), 0)
  const pengeluaran = rows
    .filter((r) => r.tipe !== 'pemasukan')
    .reduce((s, r) => s + Number(r.nominal), 0)
  const saldoKas = pemasukan - pengeluaran
  const anggaran = family.anggaran_bulanan != null ? Number(family.anggaran_bulanan) : null
  const sisa = anggaran != null ? anggaran - pengeluaran : null
  const persen = anggaran && anggaran > 0 ? Math.min(100, (pengeluaran / anggaran) * 100) : 0

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
          <div style={{ ...statBig, color: saldoKas >= 0 ? '#16a34a' : '#dc2626' }}>
            {rupiah(saldoKas)}
          </div>
        </div>
        {anggaran != null && (
          <div style={statCard}>
            <div style={statLabel}>Sisa anggaran</div>
            <div style={{ ...statBig, color: (sisa ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
              {rupiah(sisa ?? 0)}
            </div>
          </div>
        )}
      </div>

      {anggaran != null && (
        <div style={{ margin: '4px 0 20px' }}>
          <div style={barTrack}>
            <div
              style={{
                ...barFill,
                width: `${persen}%`,
                background: persen >= 100 ? '#dc2626' : persen >= 80 ? '#f59e0b' : '#16a34a',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>
            Terpakai {Math.round(persen)}% dari {rupiah(anggaran)}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 15, color: '#52525b', margin: '8px 0' }}>
        Rincian ({rows.length} transaksi)
      </h2>

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
                    {formatTanggalWIB(r.created_at)} · {masuk ? 'pemasukan' : 'pengeluaran'}
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
const cardsRow: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 14 }
const statCard: React.CSSProperties = {
  flex: 1,
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  padding: '14px 16px',
}
const statLabel: React.CSSProperties = { fontSize: 12, color: '#71717a', marginBottom: 6 }
const statBig: React.CSSProperties = { fontSize: 19, fontWeight: 700 }
const barTrack: React.CSSProperties = {
  height: 8,
  background: '#f4f4f5',
  borderRadius: 999,
  overflow: 'hidden',
}
const barFill: React.CSSProperties = { height: '100%', borderRadius: 999 }
const txItem: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 4px',
  borderBottom: '1px solid #f4f4f5',
}
