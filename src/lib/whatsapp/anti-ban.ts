/**
 * Utilitas anti-ban untuk pengiriman WA.
 *
 * PENTING soal "di mana ini berlaku":
 *  - Mode 'response' (trial, Baileys/Fonnte): PENGIRIM adalah gateway,
 *    jadi jeda + indikator "typing" harus diatur di sisi gateway.
 *    Jangan menahan HTTP response lama-lama (fungsi serverless tetap
 *    terbuka -> boros + gateway bisa timeout).
 *  - Mode 'cloud' (Graph API): KITA yang kirim, jadi humanizeDelay()
 *    dan throttle di sini yang berlaku.
 *
 * Faktor ban utama di WA (terutama unofficial) & cara kita mitigasi:
 *  1. Blast ke non-kontak            -> bot ini reply-only (aman by design)
 *  2. Balasan robotik 0 ms           -> humanizeDelay() jeda acak
 *  3. Pesan identik berulang (spam)  -> varyReply() bikin teks tak sama persis
 *  4. Volume tinggi/bursty           -> throttle per-nomor + cap harian
 *  5. Webhook dobel -> kirim dobel   -> dedup lewat message id (idempotensi)
 */

/** Jeda acak menyerupai manusia (ms). Dipakai di mode 'cloud'. */
export function humanDelayMs(min = 1200, max = 3500): number {
  return Math.floor(min + Math.random() * (max - min))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Variasikan teks agar tidak byte-identical antar pengiriman (pola spam
 * yang paling gampang terdeteksi). Tetap ramah, hanya rotasi kecil.
 */
export function varyReply(text: string): string {
  const marks = ['', ' ', '​'] // termasuk zero-width space
  const mark = marks[Math.floor(Math.random() * marks.length)]
  return text + mark
}

/** Batas aman kasar untuk penjagaan volume (silakan sesuaikan). */
export const LIMITS = {
  MAX_REPLIES_PER_NUMBER_PER_DAY: 200,
  MIN_GAP_MS_PER_NUMBER: 1000, // minimal jeda antar balasan ke nomor yang sama
}
