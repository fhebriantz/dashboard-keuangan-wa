// Konfigurasi paket langganan & info pembayaran.
// GANTI nilai di bawah sesuai harga & rekeningmu.

export type Paket = {
  id: string
  label: string
  harga: number
  hari: number // masa aktif (hari)
}

export const PAKET: Paket[] = [
  { id: '1bulan', label: '1 Bulan', harga: 25000, hari: 30 },
  { id: '3bulan', label: '3 Bulan', harga: 60000, hari: 90 },
  { id: '1tahun', label: '1 Tahun', harga: 200000, hari: 365 },
]

export const REKENING = {
  bank: 'BCA',
  nomor: '1234567890',
  atasNama: 'Lutfi Febrianto',
}

export function getPaket(id: string): Paket | undefined {
  return PAKET.find((p) => p.id === id)
}

export const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
