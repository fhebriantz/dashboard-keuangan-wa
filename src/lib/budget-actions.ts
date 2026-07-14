import type { SupabaseClient } from '@supabase/supabase-js'

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))

/** Set/ubah anggaran amplop kategori + catat riwayat. Return teks balasan. */
export async function applySetBudget(
  supabase: SupabaseClient,
  familyId: string,
  kategori: string,
  nominal: number,
): Promise<string> {
  const { data: prev } = await supabase
    .from('category_budgets')
    .select('nominal')
    .eq('family_id', familyId)
    .eq('kategori', kategori)
    .maybeSingle()
  const { error } = await supabase
    .from('category_budgets')
    .upsert({ family_id: familyId, kategori, nominal }, { onConflict: 'family_id,kategori' })
  if (error) return 'Gagal menyimpan anggaran. Coba lagi sebentar.'
  await supabase.from('budget_logs').insert({
    family_id: familyId,
    kategori,
    aksi: 'set',
    nominal_lama: prev ? Number(prev.nominal) : null,
    nominal_baru: nominal,
  })
  return `✅ Anggaran *${kategori}* diset ${rupiah(nominal)}/bulan.`
}

/** Pindah jatah antar amplop + catat riwayat. */
export async function applyMoveBudget(
  supabase: SupabaseClient,
  familyId: string,
  dari: string,
  ke: string,
  nominal: number,
): Promise<string> {
  const { data: buds } = await supabase
    .from('category_budgets')
    .select('kategori, nominal')
    .eq('family_id', familyId)
    .in('kategori', [dari, ke])
  const cur: Record<string, number> = {}
  ;(buds ?? []).forEach((b) => (cur[b.kategori] = Number(b.nominal)))
  const dariLama = cur[dari] ?? 0
  const keLama = cur[ke] ?? 0
  const dariBaru = Math.max(0, dariLama - nominal)
  const keBaru = keLama + nominal

  const { error } = await supabase.from('category_budgets').upsert(
    [
      { family_id: familyId, kategori: dari, nominal: dariBaru },
      { family_id: familyId, kategori: ke, nominal: keBaru },
    ],
    { onConflict: 'family_id,kategori' },
  )
  if (error) return 'Gagal memindahkan jatah. Coba lagi sebentar.'
  await supabase.from('budget_logs').insert([
    { family_id: familyId, kategori: dari, aksi: 'pindah_keluar', nominal_lama: dariLama, nominal_baru: dariBaru },
    { family_id: familyId, kategori: ke, aksi: 'pindah_masuk', nominal_lama: keLama, nominal_baru: keBaru },
  ])
  return (
    `✅ Pindah ${rupiah(nominal)} dari *${dari}* ke *${ke}*.\n` +
    `${dari}: ${rupiah(dariBaru)} · ${ke}: ${rupiah(keBaru)}`
  )
}

/** Hapus amplop kategori + catat riwayat. */
export async function applyDeleteBudget(
  supabase: SupabaseClient,
  familyId: string,
  kategori: string,
): Promise<string> {
  const { data: prev } = await supabase
    .from('category_budgets')
    .select('nominal')
    .eq('family_id', familyId)
    .eq('kategori', kategori)
    .maybeSingle()
  if (!prev) return `Amplop *${kategori}* memang belum ada.`
  const { error } = await supabase
    .from('category_budgets')
    .delete()
    .eq('family_id', familyId)
    .eq('kategori', kategori)
  if (error) return 'Gagal menghapus amplop. Coba lagi sebentar.'
  await supabase.from('budget_logs').insert({
    family_id: familyId,
    kategori,
    aksi: 'hapus',
    nominal_lama: Number(prev.nominal),
    nominal_baru: 0,
  })
  return `🗑️ Amplop *${kategori}* dihapus. Pengeluaran kategori ini tetap tercatat.`
}
