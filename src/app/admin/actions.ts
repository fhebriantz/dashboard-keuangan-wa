'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { getPackage } from '@/lib/pricing'
import {
  verifyPassword,
  setSession,
  clearSession,
  isAuthed,
} from '@/lib/admin-auth'

async function guard() {
  if (!(await isAuthed())) redirect('/admin/login')
}

export async function login(formData: FormData) {
  const pw = String(formData.get('password') ?? '')
  if (!verifyPassword(pw)) redirect('/admin/login?err=1')
  await setSession()
  redirect('/admin')
}

export async function logout() {
  await clearSession()
  redirect('/admin/login')
}

export async function createFamily(formData: FormData) {
  await guard()
  const nama = String(formData.get('nama_keluarga') ?? '').trim()
  if (!nama) redirect('/admin?err=' + encodeURIComponent('Nama keluarga wajib diisi'))

  const status = String(formData.get('status_langganan') ?? 'active')
  const expiredRaw = String(formData.get('expired_at') ?? '').trim()

  const supabase = createAdminClient()
  const { error } = await supabase.from('families').insert({
    nama_keluarga: nama,
    status_langganan: status === 'expired' ? 'expired' : 'active',
    expired_at: expiredRaw ? expiredRaw : null,
  })
  if (error) redirect('/admin?err=' + encodeURIComponent(error.message))

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent(`Keluarga "${nama}" ditambahkan`))
}

export async function createUser(formData: FormData) {
  await guard()
  const family_id = String(formData.get('family_id') ?? '')
  const nama = String(formData.get('nama') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim() || 'anggota'
  const nomor = normalizePhone(String(formData.get('nomor_wa') ?? ''))

  if (!family_id) redirect('/admin?err=' + encodeURIComponent('Pilih keluarga dulu'))
  if (!nama) redirect('/admin?err=' + encodeURIComponent('Nama wajib diisi'))
  if (!nomor)
    redirect('/admin?err=' + encodeURIComponent('Nomor WA tidak valid (format 628...)'))

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('users')
    .insert({ family_id, nama, nomor_wa: nomor, role })
  if (error) {
    const msg =
      error.code === '23505' ? 'Nomor WA itu sudah terdaftar' : error.message
    redirect('/admin?err=' + encodeURIComponent(msg))
  }

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent(`Anggota ${nama} (${nomor}) ditambahkan`))
}

export async function approveRegistration(formData: FormData) {
  await guard()
  const id = String(formData.get('id') ?? '')
  const supabase = createAdminClient()

  const { data: reg } = await supabase
    .from('registrations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!reg) redirect('/admin?err=' + encodeURIComponent('Pendaftaran tidak ditemukan'))
  if (reg.status !== 'pending')
    redirect('/admin?err=' + encodeURIComponent('Pendaftaran sudah diproses'))

  const pkg = await getPackage(supabase, reg.paket)
  const bulan = pkg?.bulan ?? 1
  const expired = new Date(Date.now() + bulan * 30 * 86_400_000).toISOString()

  const { data: fam, error: famErr } = await supabase
    .from('families')
    .insert({ nama_keluarga: reg.nama_keluarga, status_langganan: 'active', expired_at: expired })
    .select('id')
    .single()
  if (famErr || !fam)
    redirect('/admin?err=' + encodeURIComponent(famErr?.message ?? 'Gagal membuat keluarga'))

  // Anggota dari kolom JSON baru; fallback ke kolom lama (suami/istri).
  const members: Array<Record<string, string>> = []
  const list: Array<{ nama?: string; wa?: string }> = Array.isArray(reg.members)
    ? reg.members
    : []
  if (list.length > 0) {
    list.forEach((m, i) => {
      if (m.wa)
        members.push({ family_id: fam.id, nama: m.nama || `Anggota ${i + 1}`, nomor_wa: m.wa, role: 'anggota' })
    })
  } else {
    if (reg.wa_suami)
      members.push({ family_id: fam.id, nama: reg.nama_suami || 'Suami', nomor_wa: reg.wa_suami, role: 'suami' })
    if (reg.wa_istri)
      members.push({ family_id: fam.id, nama: reg.nama_istri || 'Istri', nomor_wa: reg.wa_istri, role: 'istri' })
  }

  if (members.length > 0) {
    const { error: uErr } = await supabase.from('users').insert(members)
    if (uErr)
      redirect(
        '/admin?err=' +
          encodeURIComponent(
            'Keluarga dibuat, tapi nomor gagal: ' +
              (uErr.code === '23505' ? 'salah satu nomor sudah terdaftar' : uErr.message),
          ),
      )
  }

  await supabase
    .from('registrations')
    .update({ status: 'approved', family_id: fam.id, processed_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent(`Pendaftaran "${reg.nama_keluarga}" disetujui & diaktifkan`))
}

export async function updatePricing(formData: FormData) {
  await guard()
  const harga_keluarga = Number(formData.get('harga_keluarga') ?? 0)
  const harga_anggota = Number(formData.get('harga_anggota') ?? 0)
  const bank = String(formData.get('bank') ?? '').trim()
  const rekening = String(formData.get('rekening') ?? '').trim()
  const atas_nama = String(formData.get('atas_nama') ?? '').trim()

  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('pricing_config').select('id').limit(1).maybeSingle()
  const payload = {
    harga_keluarga: Number.isFinite(harga_keluarga) ? harga_keluarga : 0,
    harga_anggota: Number.isFinite(harga_anggota) ? harga_anggota : 0,
    bank,
    rekening,
    atas_nama,
    updated_at: new Date().toISOString(),
  }
  const { error } = existing
    ? await supabase.from('pricing_config').update(payload).eq('id', existing.id)
    : await supabase.from('pricing_config').insert(payload)
  if (error) redirect('/admin?err=' + encodeURIComponent(error.message))

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent('Harga & rekening diperbarui'))
}

export async function addPackage(formData: FormData) {
  await guard()
  const label = String(formData.get('label') ?? '').trim()
  const bulan = parseInt(String(formData.get('bulan') ?? ''), 10)
  if (!label) redirect('/admin?err=' + encodeURIComponent('Label paket wajib diisi'))
  if (!Number.isFinite(bulan) || bulan <= 0)
    redirect('/admin?err=' + encodeURIComponent('Durasi (bulan) tidak valid'))

  const supabase = createAdminClient()
  const { error } = await supabase.from('packages').insert({ label, bulan, urutan: bulan })
  if (error) redirect('/admin?err=' + encodeURIComponent(error.message))

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent(`Paket "${label}" ditambahkan`))
}

export async function deletePackage(formData: FormData) {
  await guard()
  const id = String(formData.get('id') ?? '')
  const supabase = createAdminClient()
  await supabase.from('packages').delete().eq('id', id)
  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent('Paket dihapus'))
}

export async function rejectRegistration(formData: FormData) {
  await guard()
  const id = String(formData.get('id') ?? '')
  const supabase = createAdminClient()
  await supabase
    .from('registrations')
    .update({ status: 'rejected', processed_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent('Pendaftaran ditolak'))
}

export async function toggleFamilyStatus(formData: FormData) {
  await guard()
  const id = String(formData.get('id') ?? '')
  const current = String(formData.get('current') ?? '')
  const next = current === 'active' ? 'expired' : 'active'

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('families')
    .update({ status_langganan: next })
    .eq('id', id)
  if (error) redirect('/admin?err=' + encodeURIComponent(error.message))

  revalidatePath('/admin')
  redirect('/admin?ok=' + encodeURIComponent('Status langganan diperbarui'))
}
