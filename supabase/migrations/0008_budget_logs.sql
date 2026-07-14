-- =============================================================
-- Riwayat perubahan amplop (audit trail).
-- Jalankan di Supabase SQL Editor SETELAH 0007.
-- =============================================================
-- Mencatat tiap kali anggaran kategori diubah (set) atau dipindah
-- antar kategori (pindah). Ditampilkan di halaman laporan.

create table if not exists public.budget_logs (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families(id) on delete cascade,
  kategori     text not null,
  aksi         text not null, -- 'set' | 'pindah_masuk' | 'pindah_keluar'
  nominal_lama numeric(14,2),
  nominal_baru numeric(14,2) not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_budgetlog_family
  on public.budget_logs(family_id, created_at desc);

alter table public.budget_logs enable row level security;
alter table public.budget_logs force row level security;
