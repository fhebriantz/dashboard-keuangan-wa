export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 40, lineHeight: 1.6 }}>
      <h1>Dashboard Keuangan WA</h1>
      <p>Server berjalan. Webhook aktif di:</p>
      <pre
        style={{
          background: '#f4f4f5',
          padding: '12px 16px',
          borderRadius: 8,
          display: 'inline-block',
        }}
      >
        POST /api/webhook/whatsapp
      </pre>
      <p>Lihat README.md untuk panduan instalasi.</p>
    </main>
  )
}
