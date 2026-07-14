'use client'

export default function ThemeToggle() {
  return (
    <button
      aria-label="Ganti tema"
      onClick={() => {
        const el = document.documentElement
        const cur =
          el.dataset.theme ||
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        const next = cur === 'dark' ? 'light' : 'dark'
        el.dataset.theme = next
        try {
          localStorage.setItem('laporan-theme', next)
        } catch (e) {}
      }}
      style={{
        display: 'grid',
        placeItems: 'center',
        height: 40,
        width: 40,
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      🌓
    </button>
  )
}
