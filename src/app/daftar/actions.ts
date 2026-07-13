'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { getPaket } from '@/lib/pricing'

export async function submitRegistration(formData: FormData) {
  const nama_keluarga = String(formData.get('nama_keluarga') ?? '').trim()
  const nama_suami = String(formData.get('nama_suami') ?? '').trim()
  const nama_istri = String(formData.get('nama_istri') ?? '').trim()
  const wa_suami = normalizePhone(String(formData.get('wa_suami') ?? ''))
  const wa_istri = normalizePhone(String(formData.get('wa_istri') ?? ''))
  const paket = String(formData.get('paket') ?? '')

  const err = (m: string) => redirect('/daftar?err=' + encodeURIComponent(m))

  if (!nama_keluarga) err('Nama keluarga wajib diisi')
  if (!getPaket(paket)) err('Paket tidak valid')
  // Minimal satu nomor WA valid (suami atau istri).
  if (!wa_suami && !wa_istri)
    err('Isi minimal satu nomor WA yang valid (format 08... atau 62...)')

  const supabase = createAdminClient()
  const { error } = await supabase.from('registrations').insert({
    nama_keluarga,
    nama_suami: nama_suami || null,
    wa_suami,
    nama_istri: nama_istri || null,
    wa_istri,
    paket,
  })
  if (error) err(error.message)

  redirect('/daftar?sukses=1&paket=' + encodeURIComponent(paket))
}
