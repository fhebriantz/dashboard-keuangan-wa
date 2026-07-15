// Sumber tunggal daftar "cocok untuk" — dipakai landing & panduan agar konsisten.
// Semua contoh HANYA memakai fitur yang benar-benar ada (catat pemasukan/
// pengeluaran/saldo, amplop, iuran, roster, laporan publik, reminder).

export type UseCase = {
  icon: string
  title: string
  mode: 'keluarga' | 'komunitas'
  tagline: string
  contoh: string[] // baris chat contoh yang diketik ke bot
}

export const USE_CASES: UseCase[] = [
  {
    icon: '👨‍👩‍👧',
    title: 'Keluarga / Pribadi',
    mode: 'keluarga',
    tagline: 'Catat belanja & pemasukan rumah tangga, atur amplop per kategori.',
    contoh: ['Bensin 50rb', 'masuk gaji 10jt', 'amplop makan 2jt', 'laporan'],
  },
  {
    icon: '🏘️',
    title: 'RT / RW & Lingkungan',
    mode: 'komunitas',
    tagline: 'Kelola iuran warga & kas lingkungan — warga pantau lewat 1 link.',
    contoh: ['tambah anggota Pak Budi 0812...', 'iuran bulanan 50rb', 'jatuh tempo 10', 'Budi bayar', 'belum bayar'],
  },
  {
    icon: '🤝',
    title: 'Paguyuban / Komunitas / Arisan',
    mode: 'komunitas',
    tagline: 'Iuran anggota & dana kegiatan tercatat rapi dan transparan.',
    contoh: ['iuran Rina 100rb', 'beli konsumsi 250rb', 'sudah bayar', 'link laporan'],
  },
  {
    icon: '🎓',
    title: 'Kas Kelas / Sekolah',
    mode: 'komunitas',
    tagline: 'Kas kelas transparan untuk wali murid — jelas masuk & terpakainya.',
    contoh: ['tambah anggota Ibu Sari 0812...', 'iuran bulanan 25rb', 'beli spidol 30rb', 'link laporan'],
  },
  {
    icon: '❤️',
    title: 'Volunteer & Sosial',
    mode: 'komunitas',
    tagline: 'Catat donasi masuk & biaya kegiatan; laporan terbuka untuk donatur.',
    contoh: ['masuk donasi 500rb', 'beli sembako 1jt', 'total', 'link laporan'],
  },
  {
    icon: '🕌',
    title: 'Tempat Ibadah',
    mode: 'komunitas',
    tagline: 'Infak/donasi & pengeluaran kas, laporan bening untuk jamaah.',
    contoh: ['masuk infak jumat 1,2jt', 'beli kebersihan 150rb', 'total', 'link laporan'],
  },
  {
    icon: '🏪',
    title: 'Bisnis & UMKM',
    mode: 'keluarga',
    tagline: 'Catat penjualan & modal harian, lihat saldo usaha kapan saja.',
    contoh: ['masuk jualan 350rb', 'kulakan 200rb', 'hari', 'laporan'],
  },
]
