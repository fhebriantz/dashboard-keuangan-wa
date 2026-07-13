export const metadata = {
  title: 'Dashboard Keuangan WA',
  description: 'Catat keuangan keluarga lewat WhatsApp',
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
