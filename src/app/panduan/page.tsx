import MarketingNav from '../MarketingNav'
import { USE_CASES } from '@/lib/use-cases'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Panduan Pemakaian — Dashboard Keuangan WA',
  description: 'Cara mencatat keuangan lewat WhatsApp: pengeluaran, pemasukan, amplop, dan contoh kasus.',
}

// Contoh chat (blok monospace).
function Chat({ lines }: { lines: Array<{ from: 'u' | 'b'; text: string }> }) {
  return (
    <div style={chatBox}>
      {lines.map((l, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <span style={{ color: l.from === 'u' ? 'var(--accent)' : 'var(--muted)', fontWeight: 700 }}>
            {l.from === 'u' ? 'Kamu' : 'Bot'} ›{' '}
          </span>
          <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  )
}

export default function PanduanPage() {
  return (
    <>
      <MarketingNav />
      <main style={wrap}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Panduan Pemakaian</div>
        <h1 style={{ fontSize: 26, margin: '2px 0 14px' }}>Dashboard Keuangan WA</h1>
      <p style={{ color: 'var(--muted)', marginTop: 10 }}>
        Catat keuangan bersama pasangan, keluarga, atau tim — cukup lewat chat WhatsApp.
        Kirim pesan ke nomor bot, langsung tercatat.
      </p>

      <Section title="1. Mencatat pengeluaran">
        <p style={p}>Ketik nama pengeluaran + nominal. Sesederhana itu.</p>
        <Chat lines={[
          { from: 'u', text: 'Bensin 50000' },
          { from: 'b', text: '✅ Tercatat\n🚗 Transport · Rp 50.000' },
        ]} />
        <p style={p}>Nominal bebas: <code style={code}>35rb</code>, <code style={code}>25k</code>, <code style={code}>1.5jt</code>, <code style={code}>100.000</code>, <code style={code}>Rp100.000</code> — semua dimengerti.</p>
      </Section>

      <Section title="2. Mencatat pemasukan">
        <p style={p}>Awali dengan <b>masuk</b> (atau <code style={code}>pemasukan</code>, <code style={code}>terima</code>, atau <code style={code}>+</code>):</p>
        <Chat lines={[
          { from: 'u', text: 'masuk gaji 10000000' },
          { from: 'b', text: '✅ Pemasukan tercatat\n💵 Rp 10.000.000' },
        ]} />
        <p style={muted}>Tanpa kata "masuk", pesan dianggap pengeluaran.</p>
      </Section>

      <Section title="3. Kategori otomatis">
        <p style={p}>Tiap pengeluaran otomatis dikelompokkan. Kalau bot ragu, dia bertanya — cukup balas satu kata:</p>
        <Chat lines={[
          { from: 'u', text: 'beli kado 100000' },
          { from: 'b', text: '📦 Lainnya · Rp 100.000\n❓ Masuk kategori apa? (Makan/Transport/…)' },
          { from: 'u', text: 'belanja' },
          { from: 'b', text: '✅ Dikategorikan sebagai 🛒 Belanja.' },
        ]} />
        <p style={p}>Mau tentukan sendiri? Tambahkan <code style={code}>#kategori</code>, mis. <code style={code}>beli obat 50rb #kesehatan</code>.</p>
      </Section>

      <Section title="4. Amplop — jatah per kategori">
        <p style={p}>Bagi uang ke "amplop" tiap kategori:</p>
        <Chat lines={[
          { from: 'u', text: 'amplop makan 2jt' },
          { from: 'b', text: '✅ Anggaran Makan diset Rp 2.000.000/bulan.' },
          { from: 'u', text: 'nasi padang 25000' },
          { from: 'b', text: '🍔 Makan · Rp 25.000\n📊 Sisa amplop Makan: Rp 1.975.000' },
        ]} />
        <p style={p}><b>Menambah amplop:</b> kirim ulang angka lebih besar (<code style={code}>amplop transport 1jt</code>).</p>
        <p style={muted}>Kata <code style={code}>amplop</code>, <code style={code}>anggaran</code>, dan <code style={code}>budget</code> sama saja.</p>
        <p style={p}><b>Pindah antar amplop:</b> <code style={code}>pindah makan transport 500rb</code>.</p>
        <p style={p}><b>Hapus amplop:</b> <code style={code}>hapus amplop makan</code>.</p>
        <div style={callout}>
          💡 <b>Pakai format singkat</b> seperti di atas — paling cepat, instan, & ringan.
          Kalau fitur pintar aktif, kalimat panjang ("amplop makan hapus aja") & foto struk
          juga dimengerti, tapi <b>sedikit lebih lambat</b> — jadi untuk sehari-hari, biasakan format singkat.
        </div>
      </Section>

      <Section title="🎯 Contoh lengkap: baru gajian">
        <p style={p}>Alur sebulan yang umum, dari terima gaji sampai belanja harian:</p>
        <Chat lines={[
          { from: 'u', text: 'masuk gaji 10000000' },
          { from: 'u', text: 'amplop makan 2500000' },
          { from: 'u', text: 'amplop transport 700000' },
          { from: 'u', text: 'amplop tabungan 3000000' },
          { from: 'u', text: 'total' },
          { from: 'b', text: '📊 Pemasukan 10jt · Pengeluaran 0 · Saldo 10jt\n🎯 Total amplop: 0 / 6,2jt' },
          { from: 'u', text: 'nasi padang 25000' },
          { from: 'u', text: 'bensin 50000' },
          { from: 'u', text: 'laporan' },
          { from: 'b', text: '📋 Rekap + rincian + 🔗 link laporan web' },
        ]} />
        <div style={callout}>
          <b>"Gaji 10jt tapi amplop cuma 6,2jt, sisanya ke mana?"</b>
          <br />
          Sisa Rp 3.800.000 <b>belum dialokasikan</b> — masih uangmu (terlihat di saldo).
          Mau ditabung? Naikkan amplop Tabungan. Amplop cuma <i>rencana</i>; uang aslinya ada di <b>saldo</b>.
        </div>
      </Section>

      <Section title="5. Lihat laporan">
        <table style={table}>
          <tbody>
            <Row k="total" v="ringkasan bulan ini + per kategori" />
            <Row k="laporan" v="rincian transaksi + link laporan web (grafik)" />
            <Row k="hari" v="pemasukan & pengeluaran hari ini" />
            <Row k="hapus" v="batalkan catatan terakhir" />
            <Row k="bantuan" v="tampilkan menu" />
          </tbody>
        </table>
        <p style={muted}>Perintah boleh huruf besar/kecil, dengan atau tanpa garis miring.</p>
      </Section>

      <Section title="🧩 Contoh sesuai kebutuhan">
        <p style={p}>
          Mesinnya sama, tinggal pilih mode saat daftar. Berikut contoh perintah untuk tiap kebutuhan:
        </p>
        <div style={{ display: 'grid', gap: 14 }}>
          {USE_CASES.map((u) => (
            <div key={u.title} style={useCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20 }}>{u.icon}</span>
                <b>{u.title}</b>
                <span style={u.mode === 'komunitas' ? tagKomunitas : tagKeluarga}>
                  {u.mode === 'komunitas' ? 'Komunitas' : 'Keluarga'}
                </span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 8px' }}>{u.tagline}</div>
              <div style={chatBox}>
                {u.contoh.map((c, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Kamu › </span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="6. Tanya jawab singkat">
        <p style={p}><b>Bot tak membalas?</b> Pastikan nomormu terdaftar & pesan ada angkanya. Ketik <code style={code}>bantuan</code>.</p>
        <p style={p}><b>Sisa amplop vs saldo?</b> Sisa amplop = jatah rencana kategori. Saldo = uang riil (pemasukan − pengeluaran); minus = nombok/pinjam.</p>
        <p style={p}><b>Suami & istri?</b> Bisa catat dari HP masing-masing; semua masuk ke keluarga yang sama.</p>
      </Section>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 36 }}>
        Dashboard Keuangan WA
      </p>
      </main>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap', width: 1 }}>
        <code style={code}>{k}</code>
      </td>
      <td style={{ ...td, color: 'var(--muted)' }}>{v}</td>
    </tr>
  )
}

/* ---------- styles ---------- */
const wrap: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 640,
  margin: '0 auto',
  padding: '28px 18px 56px',
  color: 'var(--text)',
  minHeight: '100vh',
  lineHeight: 1.6,
}
const h2: React.CSSProperties = { fontSize: 18, margin: '0 0 10px' }
const p: React.CSSProperties = { margin: '8px 0' }
const muted: React.CSSProperties = { margin: '8px 0', color: 'var(--muted)', fontSize: 14 }
const code: React.CSSProperties = {
  background: 'var(--track)',
  borderRadius: 6,
  padding: '1px 6px',
  fontSize: 13,
  fontFamily: 'ui-monospace, monospace',
}
const chatBox: React.CSSProperties = {
  background: 'var(--track)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '14px 16px',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13.5,
  margin: '10px 0',
}
const callout: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderLeft: '3px solid var(--accent)',
  borderRadius: 10,
  padding: '12px 14px',
  marginTop: 12,
  fontSize: 14,
}
const useCard: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 14,
  background: 'var(--surface)',
}
const tagBase: React.CSSProperties = {
  padding: '1px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
}
const tagKomunitas: React.CSSProperties = { ...tagBase, background: '#e0f2fe', color: '#075985' }
const tagKeluarga: React.CSSProperties = { ...tagBase, background: '#dcfce7', color: '#166534' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const td: React.CSSProperties = { padding: '8px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }
