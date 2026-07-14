import type { SupabaseClient } from '@supabase/supabase-js'

// Harga & paket kini disimpan di DB dan dikelola dari /admin.
// Model harga: (harga_keluarga + jumlahAnggota * harga_anggota) * bulan.

export type PricingConfig = {
  harga_keluarga: number
  harga_anggota: number
  bank: string
  rekening: string
  atas_nama: string
}

export type Package = {
  id: string
  label: string
  bulan: number
  aktif: boolean
  urutan: number
}

export const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

const DEFAULT_CONFIG: PricingConfig = {
  harga_keluarga: 15000,
  harga_anggota: 5000,
  bank: '-',
  rekening: '-',
  atas_nama: '-',
}

export async function getPricingConfig(supabase: SupabaseClient): Promise<PricingConfig> {
  const { data } = await supabase
    .from('pricing_config')
    .select('harga_keluarga, harga_anggota, bank, rekening, atas_nama')
    .limit(1)
    .maybeSingle()
  if (!data) return DEFAULT_CONFIG
  return {
    harga_keluarga: Number(data.harga_keluarga),
    harga_anggota: Number(data.harga_anggota),
    bank: data.bank ?? '-',
    rekening: data.rekening ?? '-',
    atas_nama: data.atas_nama ?? '-',
  }
}

export async function getPackages(
  supabase: SupabaseClient,
  onlyActive = true,
): Promise<Package[]> {
  let q = supabase
    .from('packages')
    .select('id, label, bulan, aktif, urutan')
    .order('urutan', { ascending: true })
  if (onlyActive) q = q.eq('aktif', true)
  const { data } = await q
  return (data ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    bulan: Number(p.bulan),
    aktif: p.aktif,
    urutan: Number(p.urutan),
  }))
}

export async function getPackage(
  supabase: SupabaseClient,
  id: string,
): Promise<Package | null> {
  const { data } = await supabase
    .from('packages')
    .select('id, label, bulan, aktif, urutan')
    .eq('id', id)
    .maybeSingle()
  return data
    ? { id: data.id, label: data.label, bulan: Number(data.bulan), aktif: data.aktif, urutan: Number(data.urutan) }
    : null
}

/** Total = (harga_keluarga + jumlahAnggota * harga_anggota) * bulan. */
export function hitungTotal(
  config: PricingConfig,
  jumlahAnggota: number,
  bulan: number,
): number {
  const perBulan = config.harga_keluarga + jumlahAnggota * config.harga_anggota
  return perBulan * bulan
}
