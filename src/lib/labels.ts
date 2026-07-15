// Lapisan istilah per mode keluarga. Hindari hardcode "keluarga"/"pemasukan"
// di seluruh aplikasi — pakai helper ini agar mode komunitas memakai bahasa kas.

export type FamilyMode = 'keluarga' | 'komunitas'

export type Labels = {
  unit: string // sebutan tenant ("keluarga" / "komunitas")
  masuk: string // pemasukan
  keluar: string // pengeluaran
  saldo: string // saldo
}

const KELUARGA: Labels = {
  unit: 'keluarga',
  masuk: 'Pemasukan',
  keluar: 'Pengeluaran',
  saldo: 'Saldo',
}

const KOMUNITAS: Labels = {
  unit: 'komunitas',
  masuk: 'Iuran masuk',
  keluar: 'Pengeluaran kas',
  saldo: 'Saldo kas',
}

export function asMode(value: unknown): FamilyMode {
  return value === 'komunitas' ? 'komunitas' : 'keluarga'
}

export function labels(mode: unknown): Labels {
  return asMode(mode) === 'komunitas' ? KOMUNITAS : KELUARGA
}
