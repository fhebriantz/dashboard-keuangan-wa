-- =============================================================
-- Generalisasi peran + harga/paket dikelola dari admin.
-- Jalankan di Supabase SQL Editor SETELAH 0005.
-- =============================================================

-- 1) Peran anggota tidak lagi terbatas 'suami'/'istri'.
alter table public.users drop constraint if exists users_role_check;
alter table public.users alter column role set default 'anggota';

-- 2) Pendaftaran menyimpan daftar anggota generik (nama + wa) sebagai JSON.
alter table public.registrations
  add column if not exists members jsonb;

-- 3) Konfigurasi harga & rekening (satu baris, diedit dari /admin).
create table if not exists public.pricing_config (
  id             uuid primary key default gen_random_uuid(),
  harga_keluarga numeric(14,2) not null default 15000,
  harga_anggota  numeric(14,2) not null default 5000,
  bank           text default 'BCA',
  rekening       text default '1234567890',
  atas_nama      text default 'Lutfi Febrianto',
  updated_at     timestamptz not null default now()
);
insert into public.pricing_config (harga_keluarga, harga_anggota)
select 15000, 5000
where not exists (select 1 from public.pricing_config);

-- 4) Paket durasi langganan (dikelola dari /admin).
create table if not exists public.packages (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  bulan      integer not null check (bulan > 0),
  aktif      boolean not null default true,
  urutan     integer not null default 0,
  created_at timestamptz not null default now()
);
insert into public.packages (label, bulan, urutan)
select * from (values ('1 Bulan', 1, 1), ('3 Bulan', 3, 2), ('1 Tahun', 12, 3)) as v(label, bulan, urutan)
where not exists (select 1 from public.packages);

-- RLS: tabel konfigurasi hanya diakses server (service_role). Tidak ada
-- policy publik -> anon/authenticated ditolak, service_role bypass.
alter table public.pricing_config enable row level security;
alter table public.pricing_config force row level security;
alter table public.packages enable row level security;
alter table public.packages force row level security;
