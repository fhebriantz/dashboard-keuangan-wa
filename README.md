# Dashboard Keuangan WA — Panduan Instalasi dari 0

Aplikasi **catat keuangan lewat WhatsApp** yang bisa disewakan ke banyak grup
(multi-tenant). Satu nomor bot WhatsApp dipakai bersama; sistem membedakan data
tiap grup berdasarkan **nomor HP pengirim**.

Mendukung **dua mode** (dipilih saat pendaftaran):

- **Keluarga / Pribadi / UMKM** — catat pemasukan & pengeluaran, amplop per kategori, laporan.
- **Kas Komunitas** (RT/RW, arisan, kas kelas, rumah ibadah, sosial) — kelola **iuran per anggota**,
  **laporan publik transparan** yang bisa dibuka semua warga lewat 1 link (tanpa login), dan
  **pengingat iuran otomatis** via WA (anggota bisa berhenti dengan balas `STOP`).

Fitur pendukung: **kategori otomatis + belajar**, **input banyak baris sekaligus**,
**scan struk** (via web, foto tak disimpan), dan **AI opsional** (Google Gemini) sebagai
cadangan saat parser aturan tak paham — hemat biaya karena rule-based didahulukan.

Contoh pemakaian oleh user:

```
User (WA)  : Bensin 50000
Bot balas  : ✅ Tercatat untuk Keluarga Budi
             📝 Bensin
             🚗 Transport · Rp 50.000
             📊 Sisa amplop Transport: Rp 450.000

Bendahara  : Budi bayar            (mode komunitas)
Bot balas  : ✅ Iuran Budi tercatat (Juli 2026) · Rp 50.000
```

Pelanggan juga bisa ketik `laporan`, `hari`, `hapus`, atau `bantuan`.
Owner mengelola pelanggan lewat halaman `/admin`.

Panduan ini ditulis untuk **pemula total** (sisi pemasang/admin). Ikuti berurutan dari atas.

> 📱 Mencari cara pakai untuk **pelanggan** (apa yang diketik di WhatsApp,
> contoh abis gajian, amplop, dll)? Lihat **[PANDUAN-PELANGGAN.md](PANDUAN-PELANGGAN.md)**.

---

## Daftar Isi
1. [Apa saja yang dibutuhkan](#1-apa-saja-yang-dibutuhkan)
2. [Install alat dasar (Node.js, Git, VS Code)](#2-install-alat-dasar)
3. [Ambil kode project](#3-ambil-kode-project)
4. [Buat database gratis di Supabase](#4-buat-database-gratis-di-supabase)
5. [Isi file konfigurasi (.env)](#5-isi-file-konfigurasi-env)
6. [Install & jalankan di komputer sendiri](#6-install--jalankan-di-komputer-sendiri)
7. [Daftarkan keluarga & nomor WA](#7-daftarkan-keluarga--nomor-wa)
8. [Uji tanpa WhatsApp dulu (curl)](#8-uji-tanpa-whatsapp-dulu)
9. [Sambungkan ke WhatsApp (gratis)](#9-sambungkan-ke-whatsapp-gratis)
10. [Online-kan ke internet (deploy Vercel)](#10-online-kan-ke-internet-deploy-vercel)
11. [Kelola langganan (aktif / expired)](#11-kelola-langganan)
12. [Troubleshooting](#12-troubleshooting)
13. [Struktur folder](#13-struktur-folder)

---

## 1. Apa saja yang dibutuhkan

Semua **gratis** untuk tahap percobaan:

- Komputer (Windows / Mac / Linux) + koneksi internet.
- Akun **Supabase** (database) — gratis.
- Akun **Vercel** (hosting) — gratis. *(baru dipakai di langkah 10)*
- Satu **nomor WhatsApp** khusus untuk bot (jangan nomor pribadi).
- Akun **gateway WhatsApp** (mis. Fonnte) — ada paket gratis. *(langkah 9)*

> 💡 Kamu **tidak perlu bayar apa pun** untuk menyelesaikan panduan sampai
> langkah 8. Biaya baru relevan kalau sudah punya banyak pelanggan.

---

## 2. Install alat dasar

### a. Node.js (wajib)
1. Buka https://nodejs.org
2. Download versi **LTS** (tombol kiri), lalu install seperti biasa (Next → Next → Finish).
3. Cek berhasil — buka **Terminal** (Mac/Linux) atau **PowerShell** (Windows), ketik:
   ```bash
   node -v
   ```
   Kalau keluar angka seperti `v20.x.x`, berarti sukses.

### b. Git (untuk mengambil & menyimpan kode)
- Windows: https://git-scm.com/download/win
- Mac: ketik `git --version` di Terminal, nanti ditawari install.
- Linux: `sudo apt install git`

### c. VS Code (editor kode — opsional tapi disarankan)
- Download di https://code.visualstudio.com

---

## 3. Ambil kode project

Buka Terminal/PowerShell, lalu:

```bash
# masuk ke folder tempat kamu mau simpan project, contoh:
cd Documents

# kalau kode ada di GitHub:
git clone <URL-REPO-KAMU> dashboard-keuangan-wa
cd dashboard-keuangan-wa
```

> Kalau kamu sudah punya foldernya (bukan dari GitHub), cukup `cd` ke folder itu.

Buka folder ini di VS Code: `code .`

---

## 4. Buat database gratis di Supabase

### a. Buat project
1. Daftar di https://supabase.com (bisa login pakai GitHub).
2. Klik **New Project**.
3. Isi:
   - **Name**: `dashboard-keuangan-wa`
   - **Database Password**: buat password kuat, **simpan baik-baik**.
   - **Region**: pilih **Southeast Asia (Singapore)** (paling dekat Indonesia).
4. Klik **Create new project**, tunggu ±2 menit sampai selesai.

### b. Buat tabel (jalankan SQL)
1. Di menu kiri Supabase, klik **SQL Editor** → **New query**.
2. Buka file `supabase/migrations/0001_multitenant_init.sql` dari project ini,
   **copy semua isinya**, tempel ke SQL Editor.
3. Klik **Run** (atau `Ctrl/Cmd + Enter`).
4. Kalau muncul **Success. No rows returned**, berarti tabel sudah jadi. 🎉
5. Ulangi langkah 1-3 untuk file-file migration berikutnya, **berurutan**:
   - `0002_tambah_tipe_transaksi.sql` → dukungan **pemasukan**
   - `0003_anggaran_kategori.sql` → **anggaran per kategori (amplop)**
   - `0004_pending_kategori.sql` → bot **bertanya kategori** saat tak terdeteksi
   - `0005_registrations.sql` → **pendaftaran mandiri** calon pelanggan
   - `0006_pricing_dan_generalisasi.sql` → **harga/paket dari admin** + peran anggota bebas
   - `0007_hapus_anggaran_bulanan.sql` → hapus plafon total (cukup amplop + saldo)
   - `0008_budget_logs.sql` → riwayat perubahan amplop (perintah `pindah`)
   - `0009_category_memory.sql` → bot **belajar** kategori dari koreksi user
   - `0010_webhook_events.sql` → **idempotensi** (cegah transaksi dobel saat gateway retry)
   - `0011_family_mode.sql` → **mode kas komunitas** + kolom iuran & laporan publik
   - `0012_iuran_anggota.sql` → **roster anggota** komunitas (warga yang wajib iuran)
   - `0013_iuran_pembayaran.sql` → catatan **pembayaran iuran** per periode
   - `0014_reminder_optout.sql` → **berhenti pengingat** (anggota balas `STOP`)

### c. Ambil kunci API
1. Menu kiri → **Project Settings** (ikon gerigi) → **API**.
2. Catat 3 nilai ini (nanti dipakai di langkah 5):
   - **Project URL** → contoh `https://abcd1234.supabase.co`
   - **anon public** key
   - **service_role** key ⚠️ **RAHASIA — jangan pernah dibagikan/di-commit**

---

## 5. Isi file konfigurasi (.env)

1. Di folder project, salin file contoh:
   ```bash
   cp .env.example .env
   ```
   *(Windows PowerShell: `copy .env.example .env`)*
2. Buka file `.env`, isi dengan nilai dari langkah 4c:
   ```env
   SUPABASE_URL=https://abcd1234.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        # service_role tadi

   NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...    # anon tadi

   # buat string acak panjang, mis. hasil dari: openssl rand -hex 24
   WA_WEBHOOK_SECRET=rahasia-acak-panjang-punya-kamu

   # password untuk masuk halaman admin (/admin)
   ADMIN_PASSWORD=password-kuat-punya-kamu

   # gateway WA: fonnte (rekomendasi trial) / cloud (resmi Meta) / response
   WA_PROVIDER=fonnte
   FONNTE_TOKEN=            # token device dari dashboard Fonnte (jika pakai fonnte)
   WA_CLOUD_TOKEN=
   WA_CLOUD_PHONE_ID=

   # alamat publik aplikasi (untuk link laporan/struk/upload di pesan bot)
   APP_URL=https://nama-project-kamu.vercel.app

   # rahasia cron (opsional) — dikirim otomatis oleh Vercel Cron
   CRON_SECRET=

   # balas nomor tak terdaftar? default 'false' demi hemat kuota
   REPLY_TO_UNREGISTERED=false

   # AI OPSIONAL (fallback saat parser aturan tak paham). Kosongkan = AI mati,
   # sistem tetap jalan penuh dengan rule-based. Pakai Google Gemini (bukan Claude).
   AI_PROVIDER=gemini
   GEMINI_API_KEY=                 # satu key; ATAU pakai banyak key di bawah
   GEMINI_API_KEYS=                # beberapa key dipisah koma (rotasi acak, anti-limit)
   GEMINI_MODEL=gemini-3.1-flash-lite
   GEMINI_MODELS=                  # opsional, rantai model dipisah koma
   ```

> ⚠️ File `.env` **tidak ikut ter-upload** ke GitHub (sudah diblokir oleh
> `.gitignore`). Ini disengaja demi keamanan.

---

## 6. Install & jalankan di komputer sendiri

```bash
# install semua dependency (sekali saja)
npm install

# jalankan server
npm run dev
```

Buka browser ke **http://localhost:3000** → harus muncul halaman "Server berjalan".
Biarkan Terminal ini tetap terbuka selama menguji.

---

## 7. Daftarkan keluarga & nomor WA

Sistem hanya menerima pesan dari nomor yang **sudah terdaftar**. Daftarkan lewat
Supabase (tanpa coding):

### a. Tambah keluarga
1. Supabase → menu kiri **Table Editor** → tabel **families** → **Insert → Insert row**.
2. Isi:
   - `nama_keluarga`: `Budi`
   - `status_langganan`: `active`
3. **Save**. Salin nilai kolom `id` (UUID panjang) yang muncul.

### b. Tambah anggota (suami & istri)
1. Table Editor → tabel **users** → **Insert row**.
2. Isi untuk suami:
   - `family_id`: **tempel `id` keluarga tadi**
   - `nama`: `Budi`
   - `nomor_wa`: `628123456789` ← **format WAJIB: `62` + nomor tanpa `0` depan, tanpa `+` / spasi**
   - `role`: `suami`
3. **Save**. Ulangi untuk istri (`role`: `istri`, nomor WA istri).

> 📌 Format nomor penting! `0812-3456-789` harus ditulis `628123456789`.

---

## 8. Uji tanpa WhatsApp dulu

Sebelum repot pasang WhatsApp, pastikan otaknya jalan. Buka Terminal **baru**
(biarkan `npm run dev` tetap jalan di Terminal lama), lalu:

```bash
curl -X POST "http://localhost:3000/api/webhook/whatsapp?secret=rahasia-acak-panjang-punya-kamu" \
  -H "Content-Type: application/json" \
  -d '{"sender":"628123456789","message":"Bensin 50000"}'
```

Ganti `628123456789` dengan nomor yang kamu daftarkan, dan `secret=` dengan
`WA_WEBHOOK_SECRET` di `.env`.

Hasil yang benar:

```json
{"reply":"✅ Tercatat untuk Keluarga *Budi*\n📝 Bensin\n🚗 Transport · Rp 50.000"}
```

Cek juga di Supabase → **Table Editor → transactions**, datanya harus muncul. ✅

**Uji kasus lain:**
- Nomor belum terdaftar → balasan "Nomor Anda belum terdaftar...".
- Ubah `status_langganan` keluarga jadi `expired` → balasan "Masa langganan Anda telah habis...".

---

## 9. Sambungkan ke WhatsApp (gratis)

Agar bisa online, aplikasi harus sudah di-deploy (langkah 10) supaya punya alamat
internet. **Selesaikan langkah 10 dulu**, lalu kembali ke sini. URL webhook-mu nanti:

```
https://NAMA-PROJECT-KAMU.vercel.app/api/webhook/whatsapp?secret=RAHASIA-KAMU
```

### Contoh pakai Fonnte (paket gratis)
1. Daftar di https://fonnte.com, sambungkan nomor bot (scan QR seperti WhatsApp Web).
2. Di **pengaturan Device**, isi kolom **Webhook** dengan URL di atas, lalu pilih
   sumber pesan **Personal** dan simpan. *(Menu "Webhook" di sidebar hanya berisi
   LOG, bukan tempat mengisi URL.)*
3. Salin **Token** device dari Fonnte → set di env: `WA_PROVIDER=fonnte` dan
   `FONNTE_TOKEN=<token>` (di lokal & Vercel), lalu redeploy.
4. Kirim WA "Bensin 50000" dari nomor terdaftar ke nomor bot → harus dibalas.

> **Penting soal Fonnte:** balasan TIDAK dikirim dari response webhook — server
> kita aktif memanggil API Fonnte, makanya butuh `FONNTE_TOKEN`. Fonnte juga
> mengirim data sebagai *form-data* (bukan JSON); webhook kita sudah menangani
> keduanya.
>
> Fonnte/Baileys = **gratis tapi ada risiko banned** (unofficial). Cocok untuk
> percobaan. Untuk pelanggan berbayar, pindah ke **WhatsApp Cloud API resmi**
> (set `WA_PROVIDER=cloud` + isi `WA_CLOUD_TOKEN` & `WA_CLOUD_PHONE_ID`).
> Detail anti-ban ada di `src/lib/whatsapp/anti-ban.ts`.

### Perintah yang bisa diketik pelanggan
Daftar lengkap perintah (mode keluarga & komunitas, contoh per kebutuhan) ada di
**[PANDUAN-PELANGGAN.md](PANDUAN-PELANGGAN.md)** dan halaman web **`/panduan`** —
sengaja tidak diduplikasi di sini. Ringkasnya: ketik transaksi langsung
(`Bensin 50000`), `masuk ...` untuk pemasukan, `amplop ...` untuk anggaran, dan
`bantuan` untuk menu (menu otomatis menyesuaikan mode keluarga/komunitas).

### Laporan versi web
Tiap grup punya halaman laporan yang bisa dibuka di HP:
`https://NAMA-PROJECT-KAMU.vercel.app/laporan/<family_id>`. Link ini tersedia di
halaman `/admin` (kolom **Laporan → Lihat**) — tinggal kirim ke pelanggan.

Untuk **kas komunitas**, ada laporan **publik transparan** di
`.../kas/<slug>` — bisa dibuka semua warga tanpa login, menampilkan saldo kas &
status iuran (siapa sudah/belum bayar). Bendahara ambil linknya lewat chat
`link laporan`, atau atur (buka/tutup/ganti) dari panel **Kas Komunitas** di `/admin`.

---

## 10. Online-kan ke internet (deploy Vercel)

1. Push kode ke GitHub (kalau belum):
   ```bash
   git add .
   git commit -m "Setup dashboard keuangan WA"
   git push
   ```
2. Daftar di https://vercel.com (login pakai GitHub).
3. **Add New → Project** → pilih repo `dashboard-keuangan-wa` → **Import**.
4. Di bagian **Environment Variables**, masukkan **SEMUA** isi `.env` kamu
   (satu per satu: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_WEBHOOK_SECRET`, dst).
5. Klik **Deploy**, tunggu selesai.
6. Kamu dapat alamat seperti `https://dashboard-keuangan-wa.vercel.app`.
   Itulah domain untuk URL webhook di langkah 9.

> Setiap kali kamu `git push`, Vercel otomatis deploy ulang versi terbaru.

---

## 11. Kelola langganan

Semua lewat Supabase → **Table Editor → families**:

- **Perpanjang / aktifkan**: set `status_langganan` = `active`, dan/atau isi
  `expired_at` dengan tanggal (mis. `2026-12-31 23:59:00+07`).
- **Blokir / habis**: set `status_langganan` = `expired`.

Sistem otomatis menolak pesan kalau `status_langganan` bukan `active` **atau**
`expired_at` sudah lewat.

---

## 12. Troubleshooting

| Masalah | Penyebab & Solusi |
|---|---|
| `node -v` tidak dikenali | Node.js belum terinstall / Terminal belum di-restart. Ulangi langkah 2a. |
| `npm install` error | Pastikan koneksi internet OK. Coba `npm install` lagi. |
| Webhook balas `unauthorized` | `secret` di URL/curl tidak sama dengan `WA_WEBHOOK_SECRET` di `.env`. |
| Balasan "Nomor belum terdaftar" padahal sudah daftar | Format `nomor_wa` salah. Harus `628...` (tanpa `0`, tanpa `+`). |
| Data tidak masuk ke `transactions` | Cek Terminal `npm run dev` ada pesan error? Pastikan `SUPABASE_SERVICE_ROLE_KEY` benar. |
| Di Vercel jalan, tapi lokal tidak (atau sebaliknya) | Pastikan Environment Variables di Vercel sama persis dengan `.env` lokal. |
| Supabase lambat/gagal setelah beberapa hari | Free tier **auto-pause** jika idle 1 minggu. Sudah dicegah oleh **cron keep-alive harian** (`vercel.json` → `/api/keep-alive`). Kalau masih terjadi, cek tab **Cron** di Vercel apakah jalan. |

Lihat pesan error di Terminal tempat `npm run dev` berjalan — biasanya petunjuknya jelas di situ.

---

## 13. Struktur folder

```
dashboard-keuangan-wa/
├── README.md                      ← panduan ini
├── .env.example                   ← contoh konfigurasi (salin jadi .env)
├── package.json                   ← daftar dependency & perintah
├── supabase/
│   └── migrations/
│       └── 0001_multitenant_init.sql   ← skema DB + RLS (jalankan di Supabase)
└── src/
    ├── app/
    │   ├── page.tsx               ← halaman status sederhana
    │   ├── layout.tsx
    │   ├── admin/                 ← halaman admin (kelola keluarga & nomor WA)
    │   │   ├── page.tsx
    │   │   ├── actions.ts         ← server actions (tambah/ubah data)
    │   │   └── login/page.tsx     ← login admin (password)
    │   ├── laporan/[id]/page.tsx  ← laporan read-only per keluarga (buka di HP)
    │   └── api/webhook/whatsapp/
    │       └── route.ts           ← OTAK: terima pesan WA, perintah, simpan transaksi
    └── lib/
        ├── phone.ts               ← normalisasi nomor WA (0812 -> 62812)
        ├── parse-transaction.ts   ← ubah "Bensin 50rb" jadi {nama, nominal}
        ├── time.ts                ← batas hari/bulan zona WIB untuk rekap
        ├── admin-auth.ts          ← proteksi halaman admin (cookie + HMAC)
        ├── supabase/admin.ts      ← koneksi DB (server, service_role)
        └── whatsapp/
            ├── inbound.ts         ← seragamkan payload antar-gateway
            ├── outbound.ts        ← kirim balasan (response / fonnte / cloud)
            ├── commands.ts        ← perintah bot (total, laporan, hapus, dll)
            └── anti-ban.ts        ← jeda manusiawi & variasi teks
```

### Halaman yang tersedia
| URL | Untuk siapa | Fungsi |
|---|---|---|
| `/` | umum | landing page pemasaran (harga otomatis dari admin) |
| `/demo` | umum | galeri demo laporan per kebutuhan |
| `/demo/<slug>` | umum | demo laporan sesuai segmen (keluarga, rt-rw, dst) |
| `/admin` | kamu (owner) | kelola grup, nomor WA, roster iuran + setujui pendaftaran (login) |
| `/daftar` | calon pelanggan | form pendaftaran mandiri (pilih mode) + info pembayaran |
| `/panduan` | pelanggan | panduan pemakaian web (ditautkan dari perintah `bantuan`) |
| `/laporan/<family_id>` | pelanggan | laporan keuangan bulan ini (link internal) |
| `/kas/<slug>` | umum/warga | laporan kas komunitas publik + status iuran (tanpa login) |
| `/struk/<family_id>` | pelanggan | upload foto struk (dibaca AI, foto tak disimpan) |
| `/api/webhook/whatsapp` | gateway WA | menerima pesan (bukan untuk dibuka manual) |
| `/api/keep-alive` | cron | jaga Supabase aktif + kirim pengingat iuran jatuh tempo |

### Alur pendaftaran pelanggan baru
1. Calon pelanggan chat **`daftar`** ke bot → bot balas harga + link `/daftar`.
2. Isi form `/daftar`: **pilih mode** (Keluarga / Komunitas), nama grup, anggota/pengurus, paket → muncul info transfer.
3. Kirim bukti transfer via WA → kamu cek → di `/admin` klik **Setujui & Aktifkan**.
4. Sistem otomatis membuat grup (sesuai mode) + mendaftarkan nomor + set masa aktif sesuai paket.
   Untuk komunitas, bendahara lalu menambah warga & iuran lewat chat (`tambah anggota ...`,
   `iuran bulanan ...`, `jatuh tempo ...`) atau panel **Kas Komunitas** di `/admin`.

**Harga & paket dikelola dari `/admin`** (bagian "Harga & Rekening"):
- Harga dihitung dinamis: **(harga per grup + jumlah anggota × harga per anggota) × durasi**.
  Default: Rp15.000/grup + Rp5.000/anggota per bulan.
- Rekening pembayaran dan paket durasi (1 bulan, 3 bulan, dst) juga diedit di sini.

> Produk ini **umum** — tidak terbatas suami-istri. Peran anggota bebas
> (default `anggota`), bisa untuk pasangan, keluarga, atau tim.

---

Selamat mencoba! Kalau mentok di satu langkah, catat **pesan error persisnya**
dan langkah keberapa — itu paling cepat untuk dibantu.
