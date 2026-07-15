import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { aiReadReceiptFromBase64 } from '@/lib/ai/receipt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // beri ruang bila pembacaan AI agak lambat

// Terima foto struk -> baca via AI -> simpan sebagai pengeluaran keluarga.
// GAMBAR TIDAK DISIMPAN: hanya diproses di memori lalu dibuang.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: family } = await supabase
    .from('families')
    .select('id, status_langganan, expired_at')
    .eq('id', id)
    .maybeSingle()
  if (!family) return NextResponse.json({ ok: false, error: 'Keluarga tidak ditemukan' }, { status: 404 })

  const active =
    family.status_langganan === 'active' &&
    (!family.expired_at || new Date(family.expired_at) > new Date())
  if (!active) return NextResponse.json({ ok: false, error: 'Masa langganan tidak aktif' }, { status: 403 })

  let file: unknown
  try {
    file = (await req.formData()).get('file')
  } catch {
    return NextResponse.json({ ok: false, error: 'Data tidak valid' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Tidak ada file' }, { status: 400 })

  const mime = file.type || 'image/jpeg'
  if (!mime.startsWith('image/')) return NextResponse.json({ ok: false, error: 'File harus gambar' }, { status: 400 })
  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > 5 * 1024 * 1024)
    return NextResponse.json({ ok: false, error: 'Gambar terlalu besar (maks 5MB)' }, { status: 400 })

  // Baca struk (in-memory) — gambar tidak pernah disimpan ke storage/disk.
  const entry = await aiReadReceiptFromBase64(buf.toString('base64'), mime)
  if (!entry)
    return NextResponse.json({ ok: false, error: 'Struk tak terbaca (foto kurang jelas) atau fitur AI belum aktif' })

  const { data: usr } = await supabase
    .from('users')
    .select('id')
    .eq('family_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!usr) return NextResponse.json({ ok: false, error: 'Keluarga belum punya anggota terdaftar' }, { status: 400 })

  const { error } = await supabase.from('transactions').insert({
    family_id: id,
    user_id: usr.id,
    nama_pengeluaran: entry.nama,
    nominal: entry.nominal,
    tipe: 'pengeluaran',
    kategori: entry.kategori,
  })
  if (error) return NextResponse.json({ ok: false, error: 'Gagal menyimpan catatan' }, { status: 500 })

  return NextResponse.json({
    ok: true,
    nama: entry.nama,
    nominal: entry.nominal,
    kategori: entry.kategori,
  })
}
