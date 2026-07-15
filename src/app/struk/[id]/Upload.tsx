'use client'

import { useState } from 'react'

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

type Result = { ok: boolean; error?: string; nama?: string; nominal?: number; kategori?: string }

export default function Upload({ id }: { id: string }) {
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = (e.currentTarget.elements.namedItem('file') as HTMLInputElement)
    const file = input?.files?.[0]
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/struk/${id}`, { method: 'POST', body: fd })
      setResult(await res.json())
    } catch {
      setResult({ ok: false, error: 'Gagal mengirim. Coba lagi.' })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, marginTop: 18 }}>
      <label style={pick}>
        📷 {fileName ? 'Ganti foto' : 'Ambil / pilih foto struk'}
        <input
          type="file"
          name="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? '')
            setResult(null)
          }}
        />
      </label>
      {fileName && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Dipilih: {fileName}</div>}

      <button type="submit" disabled={!fileName || busy} style={{ ...btn, opacity: !fileName || busy ? 0.6 : 1 }}>
        {busy ? 'Membaca struk…' : 'Baca & Catat'}
      </button>

      {result && result.ok && (
        <div style={okBox}>
          ✅ Tercatat!<br />
          🏷️ {result.kategori} · <b>{rupiah(result.nominal ?? 0)}</b>
          <br />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{result.nama}</span>
        </div>
      )}
      {result && !result.ok && <div style={errBox}>⚠️ {result.error}</div>}
    </form>
  )
}

const pick: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: '28px 16px',
  border: '2px dashed var(--border)',
  borderRadius: 14,
  background: 'var(--surface)',
  cursor: 'pointer',
  fontWeight: 600,
}
const btn: React.CSSProperties = {
  padding: '12px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
}
const okBox: React.CSSProperties = {
  background: '#dcfce7',
  border: '1px solid #16a34a',
  color: '#166534',
  padding: '12px 14px',
  borderRadius: 10,
  fontSize: 15,
}
const errBox: React.CSSProperties = {
  background: '#fee2e2',
  border: '1px solid #dc2626',
  color: '#991b1b',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 14,
}
