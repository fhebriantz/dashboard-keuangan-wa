import crypto from 'crypto'

// Slug URL laporan publik kas komunitas — mudah dibaca + akhiran acak agar
// tak bisa ditebak (berfungsi sebagai capability link) dan bisa dirotasi.
export function makeSlug(nama: string): string {
  const base =
    (nama || 'kas')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'kas'
  return `${base}-${crypto.randomBytes(3).toString('hex')}`
}
