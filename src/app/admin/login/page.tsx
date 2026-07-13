import { login } from '../actions'
import { hasAdminPassword, isAuthed } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>
}) {
  if (await isAuthed()) redirect('/admin')
  const sp = await searchParams

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 380,
        margin: '80px auto',
        padding: '0 20px',
      }}
    >
      <h1 style={{ fontSize: 22 }}>Admin — Masuk</h1>

      {!hasAdminPassword() && (
        <p
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          ⚠️ <b>ADMIN_PASSWORD belum di-set.</b> Tambahkan variabel{' '}
          <code>ADMIN_PASSWORD</code> di <code>.env</code> (lokal) dan di Vercel,
          lalu redeploy.
        </p>
      )}

      {sp.err && (
        <p style={{ color: '#dc2626', fontSize: 14 }}>Password salah, coba lagi.</p>
      )}

      <form action={login} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <input
          type="password"
          name="password"
          placeholder="Password admin"
          required
          style={inputStyle}
        />
        <button type="submit" style={btnStyle}>
          Masuk
        </button>
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #d4d4d8',
  borderRadius: 8,
  fontSize: 15,
}

const btnStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  cursor: 'pointer',
}
