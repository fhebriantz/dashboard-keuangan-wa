# Dashboard Keuangan WA — Panduan Instalasi dari 0

Aplikasi **catat keuangan keluarga lewat WhatsApp** yang bisa disewakan ke banyak
keluarga (multi-tenant). Satu nomor bot WhatsApp dipakai bersama; sistem
membedakan data tiap keluarga berdasarkan **nomor HP pengirim**.

Contoh pemakaian oleh user:

```
User (WA)  : Bensin 50000
Bot balas  : ✅ Tercatat untuk Keluarga Budi
             📝 Bensin
             💰 Rp 50.000
             📊 Sisa anggaran bulan ini: Rp 2.450.000

User (WA)  : total
Bot balas  : 📊 Bulan ini — Total: Rp 50.000 · Sisa: Rp 2.450.000
```

Pelanggan juga bisa ketik `laporan`, `hari`, `hapus`, atau `bantuan`.
Owner mengelola pelanggan lewat halaman `/admin`.

Panduan ini ditulis untuk **pemula total**. Ikuti berurutan dari atas.

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
5. Ulangi langkah 1-3 untuk file `0002_tambah_tipe_transaksi.sql` (menambah
   dukungan **pemasukan**). Jalankan berurutan setelah `0001`.

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
   - `anggaran_bulanan`: `2500000` *(opsional, boleh dikosongkan)*
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
{"reply":"✅ Tercatat untuk Keluarga *Budi*\n📝 Bensin\n💰 Rp 50.000\n📊 Sisa anggaran bulan ini: Rp 2.450.000"}
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
Selain mencatat pengeluaran, pelanggan bisa mengetik (dengan atau tanpa `/`):

| Ketik | Fungsi |
|---|---|
| `bantuan` / `help` / `menu` | tampilkan daftar perintah |
| `total` / `saldo` | total & sisa anggaran bulan ini |
| `laporan` / `rekap` | rincian transaksi bulan ini (15 terbaru) |
| `hari` / `today` | pengeluaran hari ini |
| `hapus` / `batal` | batalkan catatan terakhir milik sendiri |
| *(teks biasa)* | mencatat **pengeluaran**, mis. `Bensin 50000` |
| `masuk ...` / `pemasukan ...` / `+...` | mencatat **pemasukan**, mis. `masuk gaji 5000000` |

### Laporan versi web
Tiap keluarga punya halaman laporan yang bisa dibuka di HP:
`https://NAMA-PROJECT-KAMU.vercel.app/laporan/<family_id>`. Link ini tersedia di
halaman `/admin` (kolom **Laporan → Lihat**) — tinggal kirim ke pelanggan.

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
| Supabase lambat/gagal setelah beberapa hari | Free tier **auto-pause** jika idle 1 minggu. Buka dashboard Supabase untuk membangunkannya. |

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
| `/admin` | kamu (owner) | kelola keluarga & nomor WA (login password) |
| `/laporan/<family_id>` | pelanggan | lihat laporan keuangan bulan ini |
| `/api/webhook/whatsapp` | gateway WA | menerima pesan (bukan untuk dibuka manual) |

---

Selamat mencoba! Kalau mentok di satu langkah, catat **pesan error persisnya**
dan langkah keberapa — itu paling cepat untuk dibantu.
