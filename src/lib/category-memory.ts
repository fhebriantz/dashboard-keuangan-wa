import type { SupabaseClient } from '@supabase/supabase-js'

// Ingatan kategori per keluarga: nama pengeluaran -> kategori.
// Dipakai untuk auto-kategori pada pengeluaran yang mirip dengan yang
// pernah dikategorikan pengguna, sehingga bot tak bertanya berulang.

const STOP = new Set([
  'beli', 'bayar', 'buat', 'untuk', 'isi', 'top', 'up', 'di', 'ke', 'dari',
  'yang', 'dan', 'nya', 'sama', 'the',
])

function words(s: string): string[] {
  return (s ?? '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
}

/** Cari kategori yang diingat untuk nama pengeluaran ini (atau null). */
export async function lookupCategoryMemory(
  supabase: SupabaseClient,
  familyId: string,
  nama: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('category_memory')
    .select('nama_kunci, kategori')
    .eq('family_id', familyId)
  if (!data || data.length === 0) return null

  const nl = nama.toLowerCase().trim()
  const exact = data.find((r) => r.nama_kunci === nl)
  if (exact) return exact.kategori

  const nw = new Set(words(nama))
  for (const r of data) {
    if (words(r.nama_kunci).some((w) => nw.has(w))) return r.kategori
  }
  return null
}

/** Simpan/perbarui pemetaan nama -> kategori. */
export async function learnCategoryMemory(
  supabase: SupabaseClient,
  familyId: string,
  nama: string,
  kategori: string,
): Promise<void> {
  const nl = (nama ?? '').toLowerCase().trim()
  if (!nl) return
  await supabase
    .from('category_memory')
    .upsert(
      { family_id: familyId, nama_kunci: nl, kategori },
      { onConflict: 'family_id,nama_kunci' },
    )
}
