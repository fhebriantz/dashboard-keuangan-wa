'use client'

import { useState } from 'react'
import { submitRegistration } from './actions'
import type { PricingConfig, Package } from '@/lib/pricing'

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

type Member = { nama: string; wa: string }

export default function RegisterForm({
  config,
  packages,
}: {
  config: PricingConfig
  packages: Package[]
}) {
  const [members, setMembers] = useState<Member[]>([{ nama: '', wa: '' }])
  const [paket, setPaket] = useState(packages[0]?.id ?? '')

  const bulan = packages.find((p) => p.id === paket)?.bulan ?? 1
  // Hitung hanya anggota yang terisi (nama atau nomor) — sama seperti logika server.
  const jumlah = members.filter((m) => m.nama.trim() || m.wa.trim()).length
  const total = (config.harga_keluarga + jumlah * config.harga_anggota) * bulan

  const setMember = (i: number, patch: Partial<Member>) =>
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  const addMember = () => setMembers((prev) => [...prev, { nama: '', wa: '' }])
  const removeMember = (i: number) =>
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))

  return (
    <form action={submitRegistration} style={{ display: 'grid', gap: 16, marginTop: 12 }}>
      <label style={lab}>
        Nama grup / keluarga *
        <input name="nama_keluarga" required placeholder="cth: Keluarga Budi" style={inp} />
      </label>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Anggota *</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
          Isi minimal satu. Nomor inilah yang dipakai chat ke bot.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {members.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                name={`m_nama_${i}`}
                value={m.nama}
                onChange={(e) => setMember(i, { nama: e.target.value })}
                placeholder={`Nama anggota ${i + 1}`}
                style={{ ...inp, flex: 1, minWidth: 0 }}
              />
              <input
                name={`m_wa_${i}`}
                value={m.wa}
                onChange={(e) => setMember(i, { wa: e.target.value })}
                placeholder="08123..."
                inputMode="tel"
                style={{ ...inp, flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => removeMember(i)}
                disabled={members.length <= 1}
                aria-label="Hapus anggota"
                style={{ ...iconBtn, opacity: members.length <= 1 ? 0.35 : 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addMember} style={addBtn}>
          + Tambah anggota
        </button>
      </div>

      <label style={lab}>
        Pilih durasi *
        <select
          name="paket"
          required
          value={paket}
          onChange={(e) => setPaket(e.target.value)}
          style={inp}
        >
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div style={totalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 800 }}>{rupiah(total)}</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
          {rupiah(config.harga_keluarga)} (grup) + {jumlah} anggota × {rupiah(config.harga_anggota)} × {bulan} bulan
        </div>
      </div>

      <button type="submit" style={btn}>
        Daftar Sekarang
      </button>
    </form>
  )
}

/* ---------- styles ---------- */
const lab: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 14, fontWeight: 500 }
const inp: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 400,
  background: 'var(--surface)',
  color: 'var(--text)',
}
const iconBtn: React.CSSProperties = {
  flex: '0 0 auto',
  width: 40,
  height: 40,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: 14,
}
const addBtn: React.CSSProperties = {
  marginTop: 10,
  padding: '9px 14px',
  border: '1px dashed var(--accent)',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--accent)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}
const totalBox: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--accent)',
  borderRadius: 10,
  padding: '14px 16px',
  background: 'var(--surface)',
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
