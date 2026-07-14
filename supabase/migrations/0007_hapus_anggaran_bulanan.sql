-- =============================================================
-- Hapus plafon total per keluarga (anggaran_bulanan).
-- Jalankan di Supabase SQL Editor SETELAH 0006.
-- =============================================================
-- Budgeting kini cukup lewat amplop per kategori (category_budgets)
-- + saldo (pemasukan - pengeluaran). "Total amplop" dihitung otomatis
-- dari jumlah semua amplop, jadi tidak perlu field manual ini lagi.

alter table public.families drop column if exists anggaran_bulanan;
