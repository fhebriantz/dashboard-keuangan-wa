-- =============================================================
-- Tambah dukungan PEMASUKAN (income) di samping pengeluaran.
-- Jalankan di Supabase SQL Editor SETELAH 0001.
-- =============================================================

-- Kolom tipe: 'pengeluaran' (default, agar data lama tetap valid) / 'pemasukan'
alter table public.transactions
  add column if not exists tipe text not null default 'pengeluaran'
    check (tipe in ('pengeluaran', 'pemasukan'));

create index if not exists idx_tx_family_tipe
  on public.transactions(family_id, tipe, created_at desc);

-- Perbarui perhitungan "sisa anggaran": anggaran hanya soal PENGELUARAN,
-- jadi fungsi ini kini hanya menjumlah transaksi bertipe pengeluaran.
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
    and tipe = 'pengeluaran'
    and created_at >= date_trunc('month', now());
$$;
