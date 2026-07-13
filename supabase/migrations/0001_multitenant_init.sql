-- =============================================================
-- Dashboard Keuangan WA — Skema Multi-Tenant (SaaS)
-- PostgreSQL / Supabase
-- =============================================================
-- Model keamanan:
--   * Webhook WA (server) pakai service_role  -> BYPASS RLS.
--     Isolasi tenant di jalur tulis ditegakkan di KODE
--     (family_id diambil dari lookup nomor pengirim, bukan dari client).
--   * Dashboard (browser) pakai anon/authenticated -> DIBATASI RLS.
--     Tiap anggota keluarga hanya bisa baca data keluarganya sendiri.
-- =============================================================

create extension if not exists "pgcrypto";  -- untuk gen_random_uuid()

-- -------------------------------------------------------------
-- 1) families : satu baris = satu pelanggan (satu keluarga)
-- -------------------------------------------------------------
create table if not exists public.families (
  id               uuid primary key default gen_random_uuid(),
  nama_keluarga    text not null,
  status_langganan text not null default 'active'
                     check (status_langganan in ('active', 'expired')),
  expired_at       timestamptz,                 -- null = tanpa batas
  anggaran_bulanan numeric(14,2),               -- budget/bln; null = tidak dipakai
  created_at       timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 2) users : nomor WA suami & istri yang dikenali sistem
-- -------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  nama          text not null,
  -- WAJIB unik & tersimpan dalam format ternormalisasi: 62xxxxxxxxxx
  -- (tanpa '+', tanpa spasi/strip). Lihat lib/phone.ts di sisi aplikasi.
  nomor_wa      text not null unique,
  role          text not null check (role in ('suami', 'istri')),
  -- Opsional tapi PENTING agar RLS bermakna: tautkan ke akun login
  -- Supabase Auth untuk akses dashboard. Nullable karena anggota bisa
  -- didaftarkan lebih dulu sebelum punya akun login.
  auth_user_id  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_users_family_id on public.users(family_id);
create index if not exists idx_users_auth_user  on public.users(auth_user_id);

-- -------------------------------------------------------------
-- 3) transactions : pengeluaran, di-scope per family_id
-- -------------------------------------------------------------
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id) on delete cascade,
  user_id          uuid not null references public.users(id)    on delete cascade,
  nama_pengeluaran text not null,
  nominal          numeric(14,2) not null check (nominal >= 0),
  kategori         text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_tx_family_created
  on public.transactions(family_id, created_at desc);

-- =============================================================
-- Helper: family_id milik user yang sedang login (untuk RLS)
-- SECURITY DEFINER agar bisa baca tabel users tanpa kena RLS-nya
-- sendiri (mencegah rekursi kebijakan).
-- =============================================================
create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

-- =============================================================
-- Total pengeluaran keluarga pada bulan berjalan.
-- Dipakai webhook untuk menghitung estimasi sisa anggaran.
-- =============================================================
create or replace function public.family_spent_this_month(p_family_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(nominal), 0)
  from public.transactions
  where family_id = p_family_id
    and created_at >= date_trunc('month', now());
$$;

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.families      enable row level security;
alter table public.users         enable row level security;
alter table public.transactions  enable row level security;

-- Paksa RLS berlaku bahkan untuk pemilik tabel (defense in depth).
-- service_role tetap bypass karena punya atribut BYPASSRLS.
alter table public.families      force row level security;
alter table public.users         force row level security;
alter table public.transactions  force row level security;

-- --- families: anggota hanya boleh melihat keluarganya sendiri ---
drop policy if exists "family: select own" on public.families;
create policy "family: select own"
  on public.families for select
  to authenticated
  using (id = public.current_family_id());

-- --- users: hanya lihat anggota di keluarga yang sama ---
drop policy if exists "users: select own family" on public.users;
create policy "users: select own family"
  on public.users for select
  to authenticated
  using (family_id = public.current_family_id());

-- --- transactions: baca/tulis/ubah/hapus hanya di keluarga sendiri ---
drop policy if exists "tx: select own family" on public.transactions;
create policy "tx: select own family"
  on public.transactions for select
  to authenticated
  using (family_id = public.current_family_id());

drop policy if exists "tx: insert own family" on public.transactions;
create policy "tx: insert own family"
  on public.transactions for insert
  to authenticated
  with check (family_id = public.current_family_id());

drop policy if exists "tx: update own family" on public.transactions;
create policy "tx: update own family"
  on public.transactions for update
  to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

drop policy if exists "tx: delete own family" on public.transactions;
create policy "tx: delete own family"
  on public.transactions for delete
  to authenticated
  using (family_id = public.current_family_id());

-- Catatan: peran 'anon' TIDAK diberi policy apa pun -> otomatis ditolak
-- untuk semua operasi. Webhook tidak terpengaruh karena pakai service_role.
