-- =============================================================
-- Pendaftaran calon pelanggan (self-registration).
-- Jalankan di Supabase SQL Editor SETELAH 0004.
-- =============================================================
-- Calon pelanggan isi form web -> masuk sini sebagai 'pending'.
-- Admin validasi pembayaran -> 'approved' -> sistem buat family + users.

create table if not exists public.registrations (
  id            uuid primary key default gen_random_uuid(),
  nama_keluarga text not null,
  nama_suami    text,
  wa_suami      text,
  nama_istri    text,
  wa_istri      text,
  paket         text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  family_id     uuid references public.families(id) on delete set null,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz
);

create index if not exists idx_reg_status on public.registrations(status, created_at desc);

-- RLS aktif tanpa policy publik: anon/authenticated ditolak, hanya
-- service_role (server: form submit & admin) yang boleh akses.
alter table public.registrations enable row level security;
alter table public.registrations force row level security;
