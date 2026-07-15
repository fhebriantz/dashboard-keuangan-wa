import './globals.css'

export const metadata = {
  title: 'Dashboard Keuangan WA',
  description: 'Catat keuangan keluarga lewat WhatsApp',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
