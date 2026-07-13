-- =============================================================
-- State "menunggu jawaban kategori" per user.
-- Jalankan di Supabase SQL Editor SETELAH 0003.
-- =============================================================
-- Saat pengeluaran tak dikenali kategorinya, bot bertanya balik.
-- Kita simpan transaksi mana yang sedang menunggu jawaban, agar
-- pesan berikutnya (mis. "makan") bisa diterapkan ke transaksi itu.

alter table public.users
  add column if not exists pending_tx_id uuid
    references public.transactions(id) on delete set null,
  add column if not exists pending_at timestamptz;
