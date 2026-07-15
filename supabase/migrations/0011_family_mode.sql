-- =============================================================
-- Mode Kas Komunitas (Fase A) — fondasi multi-mode.
-- Jalankan di Supabase SQL Editor SETELAH 0010.
-- =============================================================
-- Satu codebase melayani dua mode:
--   'keluarga'  -> pencatatan keuangan keluarga (default, perilaku lama)
--   'komunitas' -> kas komunitas (RT/arisan/masjid) dengan iuran & laporan publik
-- Kolom iuran/transparansi disiapkan sekarang agar Fase B-E tidak perlu migrasi ulang.

alter table public.families
  add column if not exists mode text not null default 'keluarga'
    check (mode in ('keluarga', 'komunitas')),
  add column if not exists laporan_publik boolean not null default true,
  add column if not exists public_slug text unique,
  add column if not exists iuran_nominal numeric(14,2),
  add column if not exists iuran_jatuh_tempo int
    check (iuran_jatuh_tempo is null or (iuran_jatuh_tempo between 1 and 28));

-- Mode dipilih saat pendaftaran, lalu diteruskan ke families ketika di-approve.
alter table public.registrations
  add column if not exists mode text not null default 'keluarga'
    check (mode in ('keluarga', 'komunitas'));
