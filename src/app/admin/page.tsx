import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createFamily,
  createUser,
  toggleFamilyStatus,
  approveRegistration,
  rejectRegistration,
  updatePricing,
  addPackage,
  deletePackage,
  addIuranAnggota,
  deleteIuranAnggota,
  setIuranNominal,
  toggleLaporanPublik,
  rotatePublicSlug,
  logout,
} from './actions'
import { getPricingConfig, getPackages, hitungTotal, rupiah as rp } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

type Family = {
  id: string
  nama_keluarga: string
  status_langganan: string
  expired_at: string | null
  mode?: string | null
  iuran_nominal?: number | null
  iuran_jatuh_tempo?: number | null
  laporan_publik?: boolean | null
  public_slug?: string | null
}
type Anggota = {
  id: string
  family_id: string
  nama: string
  nomor_wa: string | null
  nominal_default: number | null
}
type User = {
  id: string
  family_id: string
  nama: string
  nomor_wa: string
  role: string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>
}) {
  if (!(await isAuthed())) redirect('/admin/login')
  const sp = await searchParams

  const supabase = createAdminClient()
  const [{ data: families }, { data: users }, { data: regs }, { data: anggota }] = await Promise.all([
    supabase
      .from('families')
      .select('id, nama_keluarga, status_langganan, expired_at, mode, iuran_nominal, iuran_jatuh_tempo, laporan_publik, public_slug')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, family_id, nama, nomor_wa, role')
      .order('created_at', { ascending: false }),
    supabase
      .from('registrations')
      .select('id, nama_keluarga, members, paket, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('iuran_anggota')
      .select('id, family_id, nama, nomor_wa, nominal_default')
      .eq('aktif', true)
      .order('nama'),
  ])

  const [config, packages] = await Promise.all([
    getPricingConfig(supabase),
    getPackages(supabase, false),
  ])

  const fam = (families ?? []) as Family[]
  const usr = (users ?? []) as User[]
  const roster = (anggota ?? []) as Anggota[]
  const komunitas = fam.filter((f) => f.mode === 'komunitas')
  const appBase = process.env.APP_URL?.replace(/\/$/, '') ?? ''
  const pending = (regs ?? []) as Array<{
    id: string
    nama_keluarga: string
    members: Array<{ nama?: string; wa?: string }> | null
    paket: string
  }>
  const pkgById = (id: string) => packages.find((p) => p.id === id)
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

      {/* ---------- Pendaftaran masuk ---------- */}
      {pending.length > 0 && (
        <section style={{ ...card, borderColor: '#f59e0b', background: '#fffbeb' }}>
          <h2 style={h2}>🔔 Pendaftaran masuk ({pending.length})</h2>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 0 }}>
            Cek bukti transfer di WhatsApp, lalu <b>Setujui</b> untuk mengaktifkan.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {pending.map((r) => {
              const anggota = Array.isArray(r.members) ? r.members : []
              const pkg = pkgById(r.paket)
              const total = hitungTotal(config, anggota.length, pkg?.bulan ?? 1)
              return (
              <div key={r.id} style={{ ...card, background: '#fff' }}>
                <div style={{ fontWeight: 600 }}>{r.nama_keluarga}</div>
                <div style={{ fontSize: 14, color: '#52525b', margin: '4px 0' }}>
                  Paket: {pkg?.label ?? r.paket} · {anggota.length} anggota ·{' '}
                  <b>{rp(total)}</b>
                </div>
                <div style={{ fontSize: 14 }}>
                  {anggota.map((m, i) => (
                    <div key={i}>
                      {m.nama || `Anggota ${i + 1}`}: {m.wa ?? '—'}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <form action={approveRegistration}>
                    <input type="hidden" name="id" value={r.id} />
                    <button style={btn}>Setujui & Aktifkan</button>
                  </form>
                  <form action={rejectRegistration}>
                    <input type="hidden" name="id" value={r.id} />
                    <button style={ghostBtn}>Tolak</button>
                  </form>
                </div>
              </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ---------- Kelola Harga & Paket ---------- */}
      <section style={card}>
        <h2 style={h2}>💳 Harga & Rekening</h2>
        <form action={updatePricing} style={grid}>
          <label style={lab}>
            Harga per grup / bulan
            <input name="harga_keluarga" type="number" defaultValue={config.harga_keluarga} style={inp} />
          </label>
          <label style={lab}>
            Harga per anggota / bulan
            <input name="harga_anggota" type="number" defaultValue={config.harga_anggota} style={inp} />
          </label>
          <label style={lab}>
            Bank
            <input name="bank" defaultValue={config.bank} style={inp} />
          </label>
          <label style={lab}>
            Nomor rekening
            <input name="rekening" defaultValue={config.rekening} style={inp} />
          </label>
          <label style={lab}>
            Atas nama
            <input name="atas_nama" defaultValue={config.atas_nama} style={inp} />
          </label>
          <button style={btn}>Simpan Harga</button>
        </form>

        <h3 style={{ fontSize: 15, marginTop: 20 }}>Paket Durasi</h3>
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {packages.map((p) => (
            <div
              key={p.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}
            >
              <span>
                {p.label} — {p.bulan} bulan {p.aktif ? '' : '(nonaktif)'}
              </span>
              <form action={deletePackage}>
                <input type="hidden" name="id" value={p.id} />
                <button style={ghostBtn}>Hapus</button>
              </form>
            </div>
          ))}
        </div>
        <form action={addPackage} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="label" placeholder="cth: 6 Bulan" style={{ ...inp, flex: 1 }} />
          <input name="bulan" type="number" placeholder="bulan" style={{ ...inp, width: 90 }} />
          <button style={btn}>Tambah Paket</button>
        </form>
      </section>

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
              Peran (bebas)
              <input name="role" defaultValue="anggota" placeholder="anggota / suami / istri / anak" style={inp} />
            </label>
            <button style={btn}>Simpan Anggota</button>
          </form>
        )}
        <p style={{ color: '#71717a', fontSize: 13, marginTop: 8 }}>
          Nomor boleh ditulis <code>0812...</code> atau <code>62812...</code> — otomatis dirapikan.
        </p>
      </section>

      {/* ---------- Kas Komunitas ---------- */}
      {komunitas.length > 0 && (
        <section style={{ ...card, borderColor: '#0ea5e9' }}>
          <h2 style={h2}>🏘️ Kas Komunitas ({komunitas.length})</h2>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 0 }}>
            Kelola roster warga, iuran default, dan link laporan publik tiap komunitas.
          </p>
          <div style={{ display: 'grid', gap: 16 }}>
            {komunitas.map((f) => {
              const list = roster.filter((a) => a.family_id === f.id)
              const publik = f.laporan_publik !== false
              const link = f.public_slug && appBase ? `${appBase}/kas/${f.public_slug}` : null
              return (
                <div key={f.id} style={{ ...card, marginTop: 0, background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{f.nama_keluarga}</div>

                  {/* Iuran default + laporan publik */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
                    <form action={setIuranNominal} style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <input type="hidden" name="family_id" value={f.id} />
                      <label style={{ ...lab, fontSize: 12 }}>
                        Iuran default / periode
                        <input
                          name="iuran_nominal"
                          type="number"
                          defaultValue={f.iuran_nominal ?? ''}
                          placeholder="50000"
                          style={{ ...inp, width: 130 }}
                        />
                      </label>
                      <label style={{ ...lab, fontSize: 12 }}>
                        Jatuh tempo (tgl 1-28)
                        <input
                          name="iuran_jatuh_tempo"
                          type="number"
                          min={1}
                          max={28}
                          defaultValue={f.iuran_jatuh_tempo ?? ''}
                          placeholder="5"
                          style={{ ...inp, width: 90 }}
                        />
                      </label>
                      <button style={btn}>Simpan</button>
                    </form>
                  </div>

                  {/* Link laporan publik */}
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <div style={{ color: '#52525b', marginBottom: 4 }}>
                      Laporan publik: <b>{publik ? 'AKTIF' : 'ditutup'}</b>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" style={{ color: '#0284c7', wordBreak: 'break-all' }}>
                        {link}
                      </a>
                    ) : (
                      <span style={{ color: '#71717a' }}>(belum ada link — aktifkan di bawah)</span>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <form action={toggleLaporanPublik}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="current" value={String(publik)} />
                        <input type="hidden" name="has_slug" value={String(!!f.public_slug)} />
                        <input type="hidden" name="nama" value={f.nama_keluarga} />
                        <button style={ghostBtn}>{publik ? 'Tutup laporan' : 'Buka laporan'}</button>
                      </form>
                      <form action={rotatePublicSlug}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="nama" value={f.nama_keluarga} />
                        <button style={ghostBtn}>Ganti link</button>
                      </form>
                    </div>
                  </div>

                  {/* Roster */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                      Anggota ({list.length})
                    </div>
                    {list.length > 0 && (
                      <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                        {list.map((a) => (
                          <div
                            key={a.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}
                          >
                            <span>
                              {a.nama}
                              {a.nomor_wa ? <span style={{ color: '#71717a' }}> · {a.nomor_wa}</span> : null}
                              {a.nominal_default ? <span style={{ color: '#71717a' }}> · {rp(a.nominal_default)}</span> : null}
                            </span>
                            <form action={deleteIuranAnggota}>
                              <input type="hidden" name="id" value={a.id} />
                              <button style={ghostBtn}>Hapus</button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                    <form action={addIuranAnggota} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <input type="hidden" name="family_id" value={f.id} />
                      <input name="nama" required placeholder="Nama" style={{ ...inp, flex: 1, minWidth: 110 }} />
                      <input name="nomor_wa" placeholder="08.. (opsional)" style={{ ...inp, flex: 1, minWidth: 110 }} />
                      <input name="nominal_default" type="number" placeholder="nominal" style={{ ...inp, width: 100 }} />
                      <button style={btn}>Tambah</button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ---------- Daftar ---------- */}
      <section style={card}>
        <h2 style={h2}>Daftar Keluarga ({fam.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Keluarga</th>
                <th style={th}>Status</th>
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
