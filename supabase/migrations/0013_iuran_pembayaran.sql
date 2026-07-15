-- =============================================================
-- Pembayaran iuran per periode (Fase A) — siapa bayar bulan mana.
-- Jalankan di Supabase SQL Editor SETELAH 0012.
-- =============================================================
-- Tiap pembayaran juga tercatat sebagai pemasukan di `transactions`
-- (kategori "Iuran") lewat transaction_id, sehingga saldo kas ikut naik.
-- Kolom metode/payment_ref/status disiapkan untuk QRIS (Fase E); MVP selalu
-- 'tunai'/'lunas'.

create table if not exists public.iuran_pembayaran (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  anggota_id     uuid not null references public.iuran_anggota(id) on delete cascade,
  periode        text not null,                       -- 'YYYY-MM'
  nominal        numeric(14,2) not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  metode         text not null default 'tunai'
    check (metode in ('tunai', 'transfer', 'qris')),
  payment_ref    text,                                -- id transaksi dari agregator (Fase E)
  status         text not null default 'lunas'
    check (status in ('lunas', 'pending')),
  created_at     timestamptz not null default now(),
  unique (family_id, anggota_id, periode)             -- cegah dobel bayar per periode
);

create index if not exists idx_iuran_bayar_family_periode
  on public.iuran_pembayaran(family_id, periode);

alter table public.iuran_pembayaran enable row level security;
alter table public.iuran_pembayaran force row level security;
