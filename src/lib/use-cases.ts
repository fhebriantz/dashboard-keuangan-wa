// Sumber tunggal daftar "cocok untuk" — dipakai landing & panduan agar konsisten.
// Semua contoh HANYA memakai fitur yang benar-benar ada (catat pemasukan/
// pengeluaran/saldo, amplop, iuran, roster, laporan publik, reminder).
// Tiap contoh: { ketik } = yang diketik user, { balas } = ringkas balasan bot.

export type Contoh = { ketik: string; balas: string }

export type UseCase = {
  slug: string
  icon: string
  title: string
  mode: 'keluarga' | 'komunitas'
  tagline: string
  contoh: Contoh[]
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'keluarga',
    icon: '👨‍👩‍👧',
    title: 'Keluarga / Pribadi',
    mode: 'keluarga',
    tagline: 'Catat belanja & pemasukan rumah tangga, atur amplop per kategori.',
    contoh: [
      { ketik: 'Bensin 50rb', balas: '✅ tercatat: Transport Rp50.000 + sisa amplop' },
      { ketik: 'masuk gaji 10jt', balas: '✅ pemasukan tercatat Rp10.000.000' },
      { ketik: 'amplop makan 2jt', balas: '✅ anggaran Makan diset Rp2jt/bulan' },
      { ketik: 'laporan', balas: '📋 rekap bulan ini + link laporan web' },
    ],
  },
  {
    slug: 'rt-rw',
    icon: '🏘️',
    title: 'RT / RW & Lingkungan',
    mode: 'komunitas',
    tagline: 'Kelola iuran warga & kas lingkungan — warga pantau lewat 1 link.',
    contoh: [
      { ketik: 'tambah anggota Pak Budi 0812...', balas: '✅ Pak Budi masuk roster warga' },
      { ketik: 'iuran bulanan 50rb', balas: '✅ iuran default diset Rp50rb/periode' },
      { ketik: 'jatuh tempo 10', balas: '✅ reminder otomatis tiap tanggal 10' },
      { ketik: 'Budi bayar', balas: '✅ iuran Budi tercatat, saldo kas naik' },
      { ketik: 'belum bayar', balas: '⏳ daftar warga yang belum bayar bulan ini' },
    ],
  },
  {
    slug: 'paguyuban',
    icon: '🤝',
    title: 'Paguyuban / Komunitas / Arisan',
    mode: 'komunitas',
    tagline: 'Iuran anggota & dana kegiatan tercatat rapi dan transparan.',
    contoh: [
      { ketik: 'iuran Rina 100rb', balas: '✅ iuran Rina Rp100rb tercatat' },
      { ketik: 'beli konsumsi 250rb', balas: '✅ pengeluaran kas Rp250rb' },
      { ketik: 'sudah bayar', balas: '✅ daftar anggota yang sudah bayar' },
      { ketik: 'link laporan', balas: '🔗 link laporan publik untuk dibagikan' },
    ],
  },
  {
    slug: 'kas-kelas',
    icon: '🎓',
    title: 'Kas Kelas / Sekolah',
    mode: 'komunitas',
    tagline: 'Kas kelas transparan untuk wali murid — jelas masuk & terpakainya.',
    contoh: [
      { ketik: 'tambah anggota Ibu Sari 0812...', balas: '✅ Ibu Sari masuk roster' },
      { ketik: 'iuran bulanan 25rb', balas: '✅ iuran default diset Rp25rb/periode' },
      { ketik: 'beli spidol 30rb', balas: '✅ pengeluaran kas Rp30rb' },
      { ketik: 'link laporan', balas: '🔗 link laporan untuk wali murid' },
    ],
  },
  {
    slug: 'volunteer',
    icon: '❤️',
    title: 'Volunteer & Sosial',
    mode: 'komunitas',
    tagline: 'Catat donasi masuk & biaya kegiatan; laporan terbuka untuk donatur.',
    contoh: [
      { ketik: 'masuk donasi 500rb', balas: '✅ dana masuk Rp500rb' },
      { ketik: 'beli sembako 1jt', balas: '✅ pengeluaran kas Rp1.000.000' },
      { ketik: 'total', balas: '📊 ringkasan saldo kas bulan ini' },
      { ketik: 'link laporan', balas: '🔗 link laporan untuk donatur' },
    ],
  },
  {
    slug: 'ibadah',
    icon: '🕌',
    title: 'Tempat Ibadah',
    mode: 'komunitas',
    tagline: 'Infak/donasi & pengeluaran kas, laporan bening untuk jamaah.',
    contoh: [
      { ketik: 'masuk infak jumat 1,2jt', balas: '✅ dana masuk Rp1.200.000' },
      { ketik: 'beli kebersihan 150rb', balas: '✅ pengeluaran kas Rp150rb' },
      { ketik: 'total', balas: '📊 ringkasan saldo kas' },
      { ketik: 'link laporan', balas: '🔗 link laporan untuk jamaah' },
    ],
  },
  {
    slug: 'umkm',
    icon: '🏪',
    title: 'Bisnis & UMKM',
    mode: 'keluarga',
    tagline: 'Catat penjualan & modal harian, lihat saldo usaha kapan saja.',
    contoh: [
      { ketik: 'masuk jualan 350rb', balas: '✅ pemasukan Rp350rb' },
      { ketik: 'beli stok 200rb', balas: '✅ pengeluaran Rp200rb' },
      { ketik: 'hari', balas: '📅 pemasukan & pengeluaran hari ini' },
      { ketik: 'laporan', balas: '📋 rekap + saldo usaha + link' },
    ],
  },
]
