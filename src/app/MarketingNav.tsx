'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from './laporan/[id]/ThemeToggle'

// Navbar + tema untuk semua halaman publik (landing, panduan, demo, daftar).
// Menyuntikkan variabel tema sekaligus agar tampilan konsisten di semua halaman.
// Di mobile (<= 720px) menu berubah menjadi burger.

const THEME_INIT = `(function(){try{var t=localStorage.getItem('laporan-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`
const THEME_CSS = `
:root{--bg:#f8fafc;--surface:#ffffff;--soft:#f1f5f9;--track:#f1f5f9;--text:#0f172a;--muted:#64748b;--border:#e4e4e7;--accent:#16a34a;--accent2:#0ea5e9}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1220;--surface:#0f172a;--soft:#111c30;--track:#111c30;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--accent:#22c55e;--accent2:#38bdf8}}
:root[data-theme="dark"]{--bg:#0b1220;--surface:#0f172a;--soft:#111c30;--track:#111c30;--text:#e5e7eb;--muted:#94a3b8;--border:#1e293b;--accent:#22c55e;--accent2:#38bdf8}
html{scroll-behavior:smooth}
body{background:var(--bg)}
a{color:inherit}
.mkt-desktop{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.mkt-mobile{display:none;align-items:center;gap:8px}
.mkt-burger{display:grid;place-items:center;height:40px;width:40px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:18px;line-height:1}
.mkt-panel{display:none}
@media(max-width:720px){
  .mkt-desktop{display:none}
  .mkt-mobile{display:flex}
  .mkt-panel.open{display:flex;flex-direction:column;gap:2px;padding:6px 20px 14px;border-top:1px solid var(--border)}
  .mkt-panel a{padding:11px 4px;font-size:15px;font-weight:600;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border)}
  .mkt-panel a:last-child{border-bottom:none}
}
`

export default function MarketingNav() {
  const [open, setOpen] = useState(false)

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
          <Link href="/" style={{ fontWeight: 800, fontSize: 17, textDecoration: 'none' }} onClick={() => setOpen(false)}>
            💰 KeuanganWA
          </Link>

          {/* Menu desktop */}
          <div className="mkt-desktop">
            <Link href="/#fitur" style={link}>Fitur</Link>
            <Link href="/#harga" style={link}>Harga</Link>
            <Link href="/panduan" style={link}>Panduan</Link>
            <Link href="/demo" style={link}>Demo</Link>
            <Link href="/daftar" style={cta}>Daftar</Link>
            <ThemeToggle />
          </div>

          {/* Kontrol mobile: tema + burger */}
          <div className="mkt-mobile">
            <ThemeToggle />
            <button
              type="button"
              className="mkt-burger"
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Panel dropdown mobile */}
        <div className={`mkt-panel${open ? ' open' : ''}`} style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Link href="/#fitur" onClick={() => setOpen(false)}>Fitur</Link>
          <Link href="/#harga" onClick={() => setOpen(false)}>Harga</Link>
          <Link href="/panduan" onClick={() => setOpen(false)}>Panduan</Link>
          <Link href="/demo" onClick={() => setOpen(false)}>Demo</Link>
          <Link href="/daftar" onClick={() => setOpen(false)}>Daftar</Link>
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
