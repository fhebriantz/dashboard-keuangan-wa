-- =============================================================
-- Opt-out reminder iuran (Fase D+) — anggota bisa berhenti diingatkan.
-- Jalankan di Supabase SQL Editor SETELAH 0013.
-- =============================================================
-- Warga membalas "STOP"/"BERHENTI" ke bot -> flag ini true -> tidak lagi
-- dikirimi reminder. Penting untuk kesehatan akun bot (cegah report spam),
-- karena nomor warga dimasukkan bendahara, bukan opt-in sendiri.

alter table public.iuran_anggota
  add column if not exists reminder_optout boolean not null default false;
