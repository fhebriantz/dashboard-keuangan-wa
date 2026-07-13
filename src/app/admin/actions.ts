'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/phone'
import { getPaket } from '@/lib/pricing'
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
  const anggaranRaw = String(formData.get('anggaran_bulanan') ?? '').trim()
  const expiredRaw = String(formData.get('expired_at') ?? '').trim()

  const supabase = createAdminClient()
  const { error } = await supabase.from('families').insert({
    nama_keluarga: nama,
    status_langganan: status === 'expired' ? 'expired' : 'active',
    anggaran_bulanan: anggaranRaw ? Number(anggaranRaw) : null,
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
  const role = String(formData.get('role') ?? '')
  const nomor = normalizePhone(String(formData.get('nomor_wa') ?? ''))

  if (!family_id) redirect('/admin?err=' + encodeURIComponent('Pilih keluarga dulu'))
  if (!nama) redirect('/admin?err=' + encodeURIComponent('Nama wajib diisi'))
  if (!nomor)
    redirect('/admin?err=' + encodeURIComponent('Nomor WA tidak valid (format 628...)'))
  if (role !== 'suami' && role !== 'istri')
    redirect('/admin?err=' + encodeURIComponent('Role tidak valid'))

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

  const hari = getPaket(reg.paket)?.hari ?? 30
  const expired = new Date(Date.now() + hari * 86_400_000).toISOString()

  const { data: fam, error: famErr } = await supabase
    .from('families')
    .insert({ nama_keluarga: reg.nama_keluarga, status_langganan: 'active', expired_at: expired })
    .select('id')
    .single()
  if (famErr || !fam)
    redirect('/admin?err=' + encodeURIComponent(famErr?.message ?? 'Gagal membuat keluarga'))

  const members: Array<Record<string, string>> = []
  if (reg.wa_suami)
    members.push({ family_id: fam.id, nama: reg.nama_suami || 'Suami', nomor_wa: reg.wa_suami, role: 'suami' })
  if (reg.wa_istri)
    members.push({ family_id: fam.id, nama: reg.nama_istri || 'Istri', nomor_wa: reg.wa_istri, role: 'istri' })

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
