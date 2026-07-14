-- =============================================================
-- Ingatan kategori (auto-belajar).
-- Jalankan di Supabase SQL Editor SETELAH 0008.
-- =============================================================
-- Saat pengguna memilih/override kategori untuk sebuah pengeluaran,
-- kita simpan pemetaan nama -> kategori per keluarga. Lain kali
-- pengeluaran dengan nama serupa langsung dikategorikan otomatis.

create table if not exists public.category_memory (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  nama_kunci text not null, -- nama pengeluaran (lowercase)
  kategori   text not null,
  created_at timestamptz not null default now(),
  unique (family_id, nama_kunci)
);

create index if not exists idx_catmem_family on public.category_memory(family_id);

alter table public.category_memory enable row level security;
alter table public.category_memory force row level security;
