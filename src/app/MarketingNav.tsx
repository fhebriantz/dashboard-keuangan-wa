import Link from 'next/link'
import ThemeToggle from './laporan/[id]/ThemeToggle'

// Navbar + tema untuk semua halaman publik (landing, panduan, demo, daftar).
// Menyuntikkan variabel tema sekaligus agar tampilan konsisten di semua halaman.

const THEME_INIT = `(function(){try{var t=localStorage.getItem('laporan-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`
const THEME_CSS = `
:root{--bg:#f8fafc;--surface:#ffffff;--soft:#f1f5f9;--track:#f1f5f9;--text:#0f172a;--muted:#64748b;--border:#e4e4e7;--accent:#16a34a;--accent2:#0ea5e9}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1220;--surface:#0f172a;--soft:#111c30;--track:#111c30;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--accent:#22c55e;--accent2:#38bdf8}}
:root[data-theme="dark"]{--bg:#0b1220;--surface:#0f172a;--soft:#111c30;--track:#111c30;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--accent:#22c55e;--accent2:#38bdf8}
html{scroll-behavior:smooth}
body{background:var(--bg)}
a{color:inherit}
`

export default function MarketingNav() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            color: 'var(--text)',
          }}
        >
          <Link href="/" style={{ fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>
            💰 KeuanganWA
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/#fitur" style={link}>Fitur</Link>
            <Link href="/#harga" style={link}>Harga</Link>
            <Link href="/panduan" style={link}>Panduan</Link>
            <Link href="/demo" style={link}>Demo</Link>
            <Link href="/daftar" style={cta}>Daftar</Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  )
}

const link: React.CSSProperties = {
  color: 'var(--muted)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
}
const cta: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: 10,
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: 14,
}
