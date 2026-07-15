# Sketsa Teknis: Mode Kas Komunitas — v2

Rencana penyesuaian codebase agar aplikasi (kini "Dashboard Keuangan WA" untuk
suami-istri/keluarga) bisa melayani **kas komunitas** (RT/RW, arisan, masjid, kas
kelas, paguyuban) tanpa membangun aplikasi baru — cukup satu codebase multi-mode.

> Konteks strategi: hasil analisis kompetitor **KumpulPay** (platform komunitas
> berbasis app+login dengan PPOB). Pembeda kita = **WhatsApp-native, nol install,
> laporan publik tanpa login**. Jangan mengejar payment/PPOB (kandang mereka);
> menang di **friksi minimal** dan **long-tail komunitas kecil** yang mereka abaikan.

## 0. Prinsip desain inti

1. **Multi-mode, bukan multi-app** — kolom `families.mode` (`'keluarga'` | `'komunitas'`).
2. **Roster anggota ≠ WA users** — bendahara yang chat; warga cukup ada di roster (nomor WA opsional).
3. **Friksi minimal = fitur utama** — bendahara cukup WA, warga cukup buka link. Jaga ini di tiap keputusan.
4. **Transparansi publik tanpa login = senjata utama** — jadikan headline produk, bukan sekadar fitur.

## 1. Perubahan schema

### `0011_family_mode.sql`
- `families.mode` (`'keluarga'` | `'komunitas'`, default `'keluarga'`)
- `families.laporan_publik` (boolean, default true) — toggle transparansi
- `families.public_slug` (text unique) — URL laporan publik yang bisa dirotasi/dimatikan
- `families.iuran_nominal` (numeric) — default iuran per periode
- `families.iuran_jatuh_tempo` (int) — tanggal 1–28 untuk reminder
- `registrations.mode` — agar mode mengalir dari pendaftaran → families saat approve

### `0012_iuran_anggota.sql` — roster warga
`id, family_id, nama, nomor_wa (opsional), nominal_default, aktif, created_at`

### `0013_iuran_pembayaran.sql` — catatan bayar per periode
`id, family_id, anggota_id, periode ('YYYY-MM'), nominal, transaction_id`,
plus hook pembayaran (dipakai Fase E, sekarang default): `metode` (`tunai`/`transfer`/`qris`),
`payment_ref`, `status` (`lunas`/`pending`). Unik per `(family_id, anggota_id, periode)`.

> Yang TIDAK berubah: `transactions` (iuran = pemasukan kategori "Iuran"), saldo,
> `category_budgets`, idempotensi. Kolom QRIS disiapkan sejak awal agar Fase E =
> tambahan murni tanpa migrasi ulang.

## 2. Lapisan istilah — `src/lib/labels.ts`
Helper `labels(mode)` mengembalikan istilah (masuk/keluar/saldo/unit) sesuai mode.
Dipakai di webhook, commands, laporan, panduan, admin. Hindari hardcode "keluarga".

## 3. Perintah WA bendahara (`src/lib/whatsapp/commands.ts`)
Perintah lama tetap. Tambahan (pola sama `detectSetBudget`, fuzzy-match nama pakai Levenshtein di `category.ts`):

| Perintah | Aksi |
|---|---|
| `iuran budi 50rb` / `budi bayar` | Catat pembayaran periode berjalan + pemasukan kategori Iuran |
| `belum bayar` | Daftar anggota belum bayar bulan ini |
| `sudah bayar` | Daftar yang sudah + tanggal |
| `tambah anggota Budi 0812xxx` | Tambah roster (nomor opsional) |
| `iuran bulanan 50rb` | Set `families.iuran_nominal` |
| `tagih` / `ingatkan` | Blast reminder WA ke belum-bayar yang punya nomor |
| `link laporan` | Balas URL publik `/kas/<public_slug>` siap di-share |

## 4. Laporan kas publik tanpa login (headline produk)
`/laporan/[id]` sudah publik (server-render pakai service_role, tanpa auth).
- **Route publik `/kas/[slug]`** memakai `public_slug`, menghormati toggle `laporan_publik`.
- Blok khusus `mode='komunitas'`: ringkasan kas (saldo, iuran masuk, keluar) + tabel status iuran (nama · ✓/✗ · tanggal · nominal).
- Reuse Chart.js yang sudah ada. 1-klik, tanpa akun — yang tak bisa ditandingi platform app+login.

## 5. Pendaftaran & admin
- `/daftar` (`RegisterForm.tsx`) — pilih **mode** di atas; Komunitas → label "Anggota" jadi "Pengurus".
- `/admin` — kelola roster, set nominal iuran, lihat status per periode, tombol on/off + rotate `public_slug`.

## 6. Reminder terjadwal (Fase D)
`/api/cron/iuran-reminder` (pola keep-alive) → blast WA ke belum-bayar via `sendReply`.
Guard `CRON_SECRET`, jeda anti-ban, maks 1×/periode/anggota.

## 7. Fase E (lanjutan, JANGAN sekarang): QRIS iuran ringan
Pakai agregator (Midtrans/Xendit), bukan bangun payment sendiri. Warga bayar dari
`/kas/[slug]` → webhook agregator → isi `iuran_pembayaran` (`metode='qris'`,
`payment_ref`, `status='lunas'`) + pemasukan otomatis. Schema sudah siap → tambahan murni.

## 8. Effort & urutan

| Fase | Isi | Effort |
|---|---|---|
| **A. Fondasi** | Migrasi 0011–0013, `labels.ts`, mode di `/daftar` | ½–1 hari |
| **B. Inti iuran** | Perintah bayar/belum bayar/roster + admin | 1–2 hari |
| **C. Transparansi publik** | Route `/kas/[slug]` + toggle + blok status iuran | ½–1 hari |
| **D. Reminder** | Cron + blast WA | ½ hari |
| **E. QRIS (nanti)** | Integrasi agregator, isi kolom yang sudah ada | 2–3 hari |

**MVP jual = A + B + C.**

**Positioning satu kalimat:** *"Kas komunitas cukup dari WhatsApp — laporan bisa
dibuka semua warga lewat 1 link, tanpa install aplikasi, tanpa daftarin anggota satu-satu."*
