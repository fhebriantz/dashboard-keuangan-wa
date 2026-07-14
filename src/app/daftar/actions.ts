'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { getPackage } from '@/lib/pricing'

const SLOTS = 5

export async function submitRegistration(formData: FormData) {
  const nama_keluarga = String(formData.get('nama_keluarga') ?? '').trim()
  const paket = String(formData.get('paket') ?? '')

  const err = (m: string) => redirect('/daftar?err=' + encodeURIComponent(m))

  if (!nama_keluarga) err('Nama grup/keluarga wajib diisi')

  const members: Array<{ nama: string; wa: string }> = []
  for (let i = 0; i < SLOTS; i++) {
    const nama = String(formData.get(`m_nama_${i}`) ?? '').trim()
    const waRaw = String(formData.get(`m_wa_${i}`) ?? '').trim()
    if (!nama && !waRaw) continue
    const wa = normalizePhone(waRaw)
    if (!wa) err(`Nomor WA "${waRaw || nama}" tidak valid (format 08... atau 62...)`)
    members.push({ nama: nama || `Anggota ${i + 1}`, wa: wa! })
  }

  if (members.length === 0) err('Isi minimal satu anggota beserta nomor WA')

  const supabase = createAdminClient()
  const pkg = await getPackage(supabase, paket)
  if (!pkg) err('Paket tidak valid')

  const { data, error } = await supabase
    .from('registrations')
    .insert({ nama_keluarga, paket, members })
    .select('id')
    .single()
  if (error || !data) err(error?.message ?? 'Gagal menyimpan pendaftaran')

  redirect('/daftar?sukses=' + data!.id)
}
