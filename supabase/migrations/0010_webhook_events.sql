-- =============================================================
-- Idempotensi webhook — cegah pemrosesan ganda saat gateway retry.
-- Jalankan di Supabase SQL Editor SETELAH 0009.
-- =============================================================
-- Tiap pesan masuk "diklaim" dengan kunci unik (sender+timestamp+isi).
-- Kalau kunci sama datang lagi (retry Fonnte), langsung diabaikan agar
-- transaksi tidak tercatat dobel.

create table if not exists public.webhook_events (
  event_key  text primary key,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_created on public.webhook_events(created_at);

alter table public.webhook_events enable row level security;
alter table public.webhook_events force row level security;
