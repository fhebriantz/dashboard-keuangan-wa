import { createAdminClient } from '@/lib/supabase/admin'
import Upload from './Upload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Upload Struk — Dashboard Keuangan WA' }

const THEME_CSS = `
:root{--bg:#f8fafc;--surface:#ffffff;--text:#18181b;--muted:#71717a;--border:#e4e4e7}
@media(prefers-color-scheme:dark){:root{--bg:#0b1220;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b}}
body{background:var(--bg)}
`

export default async function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: family } = await supabase
    .from('families')
    .select('nama_keluarga, status_langganan')
    .eq('id', id)
    .maybeSingle()

  return (
    <main style={wrap}>
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Upload Struk</div>
      <h1 style={{ fontSize: 22, margin: '2px 0 0' }}>{family?.nama_keluarga ?? 'Keluarga'}</h1>

      {!family ? (
        <p style={{ color: 'var(--muted)', marginTop: 16 }}>
          Link tidak valid. Minta link baru lewat chat bot (ketik <b>upload</b>).
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
            Foto struk belanja — total & kategori dibaca otomatis, langsung tercatat.
          </p>
          <Upload id={id} />
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
            🔒 Foto <b>tidak disimpan</b> — hanya dibaca sekali lalu dibuang. Yang tersimpan hanya hasil catatannya.
          </p>
        </>
      )}
    </main>
  )
}

const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 440,
  margin: '0 auto',
  padding: '28px 18px 48px',
  color: 'var(--text)',
  minHeight: '100vh',
}
