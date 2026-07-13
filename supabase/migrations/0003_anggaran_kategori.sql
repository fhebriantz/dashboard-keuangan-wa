-- =============================================================
-- Anggaran per kategori (sistem "amplop").
-- Jalankan di Supabase SQL Editor SETELAH 0002.
-- =============================================================
-- Tiap keluarga bisa menetapkan jatah bulanan per kategori
-- (mis. Makan 2jt, Transport 500rb). Bersifat "standing" — berlaku
-- tiap bulan; realisasi dihitung dari transaksi bulan berjalan.

create table if not exists public.category_budgets (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  kategori   text not null,
  nominal    numeric(14,2) not null check (nominal >= 0),
  created_at timestamptz not null default now(),
  unique (family_id, kategori)
);

create index if not exists idx_catbudget_family
  on public.category_budgets(family_id);

-- RLS: anggota hanya melihat anggaran keluarganya sendiri.
-- (Webhook memakai service_role -> bypass; ini untuk dashboard.)
alter table public.category_budgets enable row level security;
alter table public.category_budgets force row level security;

drop policy if exists "catbudget: select own" on public.category_budgets;
create policy "catbudget: select own"
  on public.category_budgets for select
  to authenticated
  using (family_id = public.current_family_id());
