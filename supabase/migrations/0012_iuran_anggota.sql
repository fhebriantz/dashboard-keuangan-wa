-- =============================================================
-- Roster anggota komunitas (Fase A) — daftar warga wajib iuran.
-- Jalankan di Supabase SQL Editor SETELAH 0011.
-- =============================================================
-- Berbeda dari tabel `users` (yang chat ke bot). Warga cukup terdaftar di sini
-- untuk dicatat iurannya; nomor WA opsional (hanya perlu bila mau di-reminder).

create table if not exists public.iuran_anggota (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  nama            text not null,
  nomor_wa        text,            -- opsional; dipakai untuk reminder
  nominal_default numeric(14,2),   -- fallback ke families.iuran_nominal
  aktif           boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_iuran_anggota_family
  on public.iuran_anggota(family_id);

alter table public.iuran_anggota enable row level security;
alter table public.iuran_anggota force row level security;
