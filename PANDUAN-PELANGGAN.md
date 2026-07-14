# 📱 Panduan Pemakaian — Dashboard Keuangan WA

Catat keuangan keluarga/pasangan/tim **cukup lewat chat WhatsApp**. Tidak perlu
install aplikasi apa pun. Kirim pesan ke **nomor bot**, langsung tercatat.

Panduan ini untuk **pengguna** (bukan teknis). Baca sekali, langsung bisa.

---

## Daftar Isi
1. [Cara mulai](#1-cara-mulai)
2. [Mencatat pengeluaran](#2-mencatat-pengeluaran)
3. [Mencatat pemasukan](#3-mencatat-pemasukan)
4. [Kategori otomatis](#4-kategori-otomatis)
5. [Amplop — jatah per kategori](#5-amplop--jatah-per-kategori)
6. [🎯 Contoh lengkap: baru gajian](#6-contoh-lengkap-baru-gajian)
7. [Lihat laporan](#7-lihat-laporan)
8. [Membatalkan salah catat](#8-membatalkan-salah-catat)
9. [Semua perintah (contekan)](#9-semua-perintah-contekan)
10. [Tanya jawab](#10-tanya-jawab)

---

## 1. Cara mulai

- Nomor WA kamu harus **sudah didaftarkan** oleh admin.
- Simpan **nomor bot** di kontak, lalu chat seperti biasa.
- Coba ketik **`bantuan`** — bot akan menampilkan menu.

> Suami & istri (atau anggota lain) bisa chat dari nomor masing-masing ke nomor
> bot yang sama. Semua tercatat dalam satu keluarga.

---

## 2. Mencatat pengeluaran

Ketik **nama pengeluaran + nominal**. Sesederhana itu.

```
Bensin 50000
```
Bot balas:
```
✅ Tercatat untuk Keluarga Budi
📝 Bensin
🚗 Transport · Rp 50.000
```

**Nominal boleh ditulis bebas** — semua ini dimengerti:

| Kamu ketik | Dibaca sebagai |
|---|---|
| `Makan siang 35000` | Rp 35.000 |
| `Makan siang 35rb` | Rp 35.000 |
| `Kopi 25k` | Rp 25.000 |
| `Belanja 100.000` | Rp 100.000 |
| `Servis motor 1.5jt` | Rp 1.500.000 |
| `Token listrik Rp100.000` | Rp 100.000 |

Tidak perlu format khusus. Tulis apa adanya, angka di belakang.

---

## 3. Mencatat pemasukan

Awali dengan kata **`masuk`** (atau `pemasukan`, `terima`, atau tanda `+`):

```
masuk gaji 10000000
pemasukan bonus 1jt
terima arisan 500rb
+2000000 THR
```
Bot balas:
```
✅ Pemasukan tercatat untuk Keluarga Budi
📝 gaji
💵 Rp 10.000.000
```

> Tanpa kata "masuk", pesan dianggap **pengeluaran**. Jadi jangan lupa awali
> pemasukan dengan `masuk`.

---

## 4. Kategori otomatis

Setiap pengeluaran **otomatis dikelompokkan** ke kategori. Contoh: "bensin" →
Transport, "nasi padang" → Makan, "token listrik" → Tagihan.

Kategori yang tersedia:
**Makan · Transport · Tagihan · Belanja · Kesehatan · Hiburan · Anak · Tabungan · Lainnya**

**Kalau bot tidak yakin**, dia akan bertanya:
```
Kamu : beli kado 100000
Bot  : ✅ Tercatat ...
       📦 Lainnya · Rp 100.000
       ❓ Masuk kategori apa? Balas salah satu:
       Makan · Transport · Tagihan · Belanja
       Kesehatan · Hiburan · Anak · Tabungan

Kamu : belanja          ← cukup balas 1 kata
Bot  : ✅ Dikategorikan sebagai 🛒 Belanja.
```

**Mau tentukan kategori sendiri?** Tambahkan `#kategori` di belakang:
```
beli obat 50rb #kesehatan
kado ultah 100rb #hiburan
```

**Kategori tidak ada di daftar?** Saat bot bertanya, balas saja **nama kategori
buatanmu** — mis. `olahraga` atau `donasi`. Bot menerimanya sebagai kategori baru
(bisa diberi amplop juga: `anggaran olahraga 200rb`).

**Bot belajar otomatis** 🧠 — sekali kamu kategorikan sebuah nama (mis. "kado" →
Belanja), lain kali pengeluaran dengan nama serupa **langsung** masuk kategori itu
tanpa ditanya lagi.

---

## 5. Amplop — jatah per kategori

"Amplop" = **jatah bulanan** untuk tiap kategori, seperti membagi uang ke amplop
terpisah. Set dengan **`anggaran <kategori> <nominal>`**:

```
anggaran makan 2jt
anggaran transport 500rb
anggaran tagihan 1jt
```
Bot balas:
```
✅ Anggaran Makan diset Rp 2.000.000/bulan.
```

Setelah itu, tiap kali mencatat pengeluaran di kategori tersebut, bot langsung
memberitahu **sisa amplopnya**:
```
Kamu : nasi padang 25000
Bot  : ✅ Tercatat ...
       🍔 Makan · Rp 25.000
       📊 Sisa amplop Makan: Rp 1.975.000
```

Kalau amplop terlampaui, bot memperingatkan (tapi tetap dicatat — hanya alarm):
```
⚠️ Amplop Makan lewat Rp 150.000
```

> Kata lain yang juga bisa: `budget makan 2jt` atau `amplop makan 2jt`.

### Menambah / mengisi ulang amplop
Amplop habis di tengah bulan? Tinggal **kirim ulang dengan angka baru** —
angka terakhir yang berlaku:
```
anggaran transport 700000     → jatah awal Rp 700.000
anggaran transport 1000000    → dinaikkan jadi Rp 1.000.000 (top-up +300rb)
```
Sisa amplop & "Total amplop" langsung menyesuaikan.

> Catatan: menaikkan amplop = mengubah **rencana**, jadi **tidak** mengurangi
> saldo dan **tidak** tercatat sebagai transaksi. Uang "surplus" (pemasukan yang
> belum dialokasikan) otomatis menutup kenaikan itu.

### Memindahkan jatah antar amplop
Mau geser jatah dari satu pos ke pos lain? Cukup **satu perintah**:
```
pindah makan transport 500000
```
Artinya: kurangi amplop **Makan** Rp 500.000, tambahkan ke **Transport**. Bot balas:
```
✅ Pindah Rp 500.000 dari Makan ke Transport.
Makan: Rp 1.500.000 · Transport: Rp 1.200.000
```
> Kata lain: `geser makan transport 500rb` atau `transfer makan transport 500rb`.

Semua perubahan amplop (set/tambah/pindah) tercatat di bagian **"Riwayat Amplop"**
pada laporan web.

---

## 6. 🎯 Contoh lengkap: baru gajian

Beginilah alur sebulan yang umum. Bayangkan baru terima gaji dan mau "plot-plotin":

**a. Catat gaji masuk**
```
masuk gaji 10000000
```

**b. Bagi ke amplop (rencana belanja)**
```
anggaran makan 2500000
anggaran transport 700000
anggaran tagihan 1500000
anggaran belanja 1000000
anggaran tabungan 3000000
```

**c. Cek rencana**
```
total
```
Bot:
```
📊 Bulan ini
💵 Pemasukan: Rp 10.000.000
💰 Pengeluaran: Rp 0
🧮 Saldo: Rp 10.000.000

Per kategori:
🍔 Makan: Rp 0 / Rp 2.500.000 (sisa Rp 2.500.000)
🚗 Transport: Rp 0 / Rp 700.000 (sisa Rp 700.000)
🧾 Tagihan: Rp 0 / Rp 1.500.000 (sisa Rp 1.500.000)
🛒 Belanja: Rp 0 / Rp 1.000.000 (sisa Rp 1.000.000)
🏦 Tabungan: Rp 0 / Rp 3.000.000 (sisa Rp 3.000.000)

🎯 Total amplop: Rp 0 / Rp 8.700.000 (sisa Rp 8.700.000)
```

**d. Jalani hari-hari — catat pengeluaran biasa**
```
nasi padang 25000
bensin 50000
listrik 300000
```
Tiap catatan langsung dibalas + sisa amplop kategorinya.

**e. Kapan pun, cek posisi**
```
total       → ringkasan + per kategori
hari        → pengeluaran hari ini
laporan     → rincian lengkap + link web
```

> **"Gaji 10jt tapi amplop cuma 8,7jt, sisanya ke mana?"**
> Sisa Rp 1.300.000 itu **belum dialokasikan** — masih jadi uangmu (kelihatan di
> saldo). Kalau mau dijadikan tabungan, tinggal naikkan amplop Tabungan atau buat
> amplop baru. Amplop cuma **rencana**; uang aslinya ada di **saldo**.

---

## 7. Lihat laporan

| Ketik | Hasil |
|---|---|
| `total` | ringkasan bulan ini: pemasukan, pengeluaran, saldo + per kategori |
| `laporan` | rincian transaksi + rekap kategori + link laporan web |
| `hari` | total pemasukan & pengeluaran hari ini |

**Laporan web:** saat ketik `laporan`, bot menyertakan link. Tap link itu untuk
melihat laporan versi web yang rapi (grafik amplop + rincian) — bisa dibuka
kapan saja, tanpa login.

---

## 8. Membatalkan salah catat

Salah ketik nominal atau dobel? Ketik:
```
hapus
```
Bot akan membatalkan **catatan terakhir milikmu**:
```
🗑️ Dibatalkan: Bensin — Rp 50.000
```
Lalu catat ulang yang benar.

> Kata lain yang sama: `batal` atau `undo`.

---

## 9. Semua perintah (contekan)

Simpan ini — cukup ketik salah satu (huruf besar/kecil bebas):

**Mencatat:**
```
Bensin 50000            → pengeluaran (kategori otomatis)
beli obat 50rb #kesehatan → pengeluaran + kategori manual
masuk gaji 10000000     → pemasukan
```

**Amplop:**
```
anggaran makan 2jt              → set/ubah jatah kategori Makan
pindah makan transport 500rb    → geser jatah antar kategori
```

**Lihat & kelola:**
```
total      → ringkasan bulan ini
laporan    → rincian + link web
hari       → hari ini
hapus      → batalkan catatan terakhir
bantuan    → tampilkan menu
```

---

## 10. Tanya jawab

**Bot tidak membalas?**
Pastikan nomormu sudah didaftarkan admin, dan pesanmu ada angkanya (untuk
pencatatan). Kalau ragu, ketik `bantuan`.

**Salah kategori?**
Catat ulang dengan `#kategori`, atau saat bot bertanya, balas kategori yang benar.

**Beda "sisa amplop" vs "saldo"?**
- **Sisa amplop** = sisa jatah rencana kategori itu.
- **Saldo** = uang riil (pemasukan − pengeluaran). Kalau minus, artinya kamu
  belanja lebih besar dari yang masuk (nombok/pinjam).

**Suami & istri catat dari HP masing-masing?**
Ya. Selama kedua nomor terdaftar, semua masuk ke keluarga yang sama.

**Masa langganan habis?**
Bot akan memberitahu dan berhenti mencatat sampai diperpanjang. Hubungi admin.

---

Selamat mencatat! Semakin rajin dicatat, semakin jelas ke mana uang pergi. 💪
