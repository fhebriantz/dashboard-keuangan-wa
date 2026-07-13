import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createFamily,
  createUser,
  toggleFamilyStatus,
  logout,
} from './actions'

export const dynamic = 'force-dynamic'

type Family = {
  id: string
  nama_keluarga: string
  status_langganan: string
  anggaran_bulanan: number | null
  expired_at: string | null
}
type User = {
  id: string
  family_id: string
  nama: string
  nomor_wa: string
  role: string
}

const rupiah = (n: number | null) =>
  n == null ? '—' : 'Rp ' + new Intl.NumberFormat('id-ID').format(n)

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>
}) {
  if (!(await isAuthed())) redirect('/admin/login')
  const sp = await searchParams

  const supabase = createAdminClient()
  const [{ data: families }, { data: users }] = await Promise.all([
    supabase
      .from('families')
      .select('id, nama_keluarga, status_langganan, anggaran_bulanan, expired_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, family_id, nama, nomor_wa, role')
      .order('created_at', { ascending: false }),
  ])

  const fam = (families ?? []) as Family[]
  const usr = (users ?? []) as User[]
  const famName = (id: string) =>
    fam.find((f) => f.id === id)?.nama_keluarga ?? '(?)'

  return (
    <main style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Admin — Keluarga & Nomor WA</h1>
        <form action={logout}>
          <button style={ghostBtn}>Keluar</button>
        </form>
      </div>

      {sp.ok && <p style={okBox}>✅ {sp.ok}</p>}
      {sp.err && <p style={errBox}>⚠️ {sp.err}</p>}

      {/* ---------- Tambah Keluarga ---------- */}
      <section style={card}>
        <h2 style={h2}>1. Tambah Keluarga (Pelanggan)</h2>
        <form action={createFamily} style={grid}>
          <label style={lab}>
            Nama keluarga
            <input name="nama_keluarga" required placeholder="cth: Budi" style={inp} />
          </label>
          <label style={lab}>
            Status langganan
            <select name="status_langganan" defaultValue="active" style={inp}>
              <option value="active">active (aktif)</option>
              <option value="expired">expired (habis)</option>
            </select>
          </label>
          <label style={lab}>
            Anggaran / bulan (opsional)
            <input name="anggaran_bulanan" type="number" placeholder="2500000" style={inp} />
          </label>
          <label style={lab}>
            Berlaku sampai (opsional)
            <input name="expired_at" type="date" style={inp} />
          </label>
          <button style={btn}>Simpan Keluarga</button>
        </form>
      </section>

      {/* ---------- Tambah Anggota ---------- */}
      <section style={card}>
        <h2 style={h2}>2. Tambah Nomor WA (Suami / Istri)</h2>
        {fam.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: 14 }}>
            Buat keluarga dulu di atas, baru bisa menambahkan anggota.
          </p>
        ) : (
          <form action={createUser} style={grid}>
            <label style={lab}>
              Keluarga
              <select name="family_id" required style={inp}>
                {fam.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nama_keluarga}
                  </option>
                ))}
              </select>
            </label>
            <label style={lab}>
              Nama
              <input name="nama" required placeholder="cth: Budi" style={inp} />
            </label>
            <label style={lab}>
              Nomor WA
              <input name="nomor_wa" required placeholder="08123456789 / 628123456789" style={inp} />
            </label>
            <label style={lab}>
              Peran
              <select name="role" defaultValue="suami" style={inp}>
                <option value="suami">suami</option>
                <option value="istri">istri</option>
              </select>
            </label>
            <button style={btn}>Simpan Anggota</button>
          </form>
        )}
        <p style={{ color: '#71717a', fontSize: 13, marginTop: 8 }}>
          Nomor boleh ditulis <code>0812...</code> atau <code>62812...</code> — otomatis dirapikan.
        </p>
      </section>

      {/* ---------- Daftar ---------- */}
      <section style={card}>
        <h2 style={h2}>Daftar Keluarga ({fam.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Keluarga</th>
                <th style={th}>Status</th>
                <th style={th}>Anggaran</th>
                <th style={th}>Laporan</th>
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {fam.map((f) => (
                <tr key={f.id}>
                  <td style={td}>{f.nama_keluarga}</td>
                  <td style={td}>
                    <span style={f.status_langganan === 'active' ? badgeOn : badgeOff}>
                      {f.status_langganan}
                    </span>
                  </td>
                  <td style={td}>{rupiah(f.anggaran_bulanan)}</td>
                  <td style={td}>
                    <a
                      href={`/laporan/${f.id}`}
                      target="_blank"
                      style={{ color: '#2563eb', fontSize: 13 }}
                    >
                      Lihat
                    </a>
                  </td>
                  <td style={td}>
                    <form action={toggleFamilyStatus}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="current" value={f.status_langganan} />
                      <button style={ghostBtn}>
                        {f.status_langganan === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Daftar Nomor WA ({usr.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Nama</th>
                <th style={th}>Nomor WA</th>
                <th style={th}>Peran</th>
                <th style={th}>Keluarga</th>
              </tr>
            </thead>
            <tbody>
              {usr.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.nama}</td>
                  <td style={td}>{u.nomor_wa}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{famName(u.family_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

/* ---------- styles ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 820,
  margin: '32px auto',
  padding: '0 20px',
  color: '#18181b',
}
const card: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 12,
  padding: 20,
  marginTop: 20,
}
const h2: React.CSSProperties = { fontSize: 17, marginTop: 0 }
const grid: React.CSSProperties = { display: 'grid', gap: 12, maxWidth: 420 }
const lab: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 14, fontWeight: 500 }
const inp: React.CSSProperties = {
  padding: '9px 11px',
  border: '1px solid #d4d4d8',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 400,
}
const btn: React.CSSProperties = {
  padding: '10px 14px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  cursor: 'pointer',
  justifySelf: 'start',
}
const ghostBtn: React.CSSProperties = {
  padding: '6px 10px',
  background: '#fff',
  color: '#18181b',
  border: '1px solid #d4d4d8',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
}
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '2px solid #e4e4e7',
  fontSize: 13,
  color: '#71717a',
}
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #f4f4f5' }
const okBox: React.CSSProperties = {
  background: '#dcfce7',
  border: '1px solid #16a34a',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
}
const errBox: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #dc2626',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
}
const badgeOn: React.CSSProperties = {
  background: '#dcfce7',
  color: '#166534',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
}
const badgeOff: React.CSSProperties = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
}
