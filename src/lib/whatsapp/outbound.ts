/**
 * Pengiriman balasan WA — "seam" migrasi trial -> berbayar.
 *
 * Dua mode balasan, dipilih lewat env WA_PROVIDER:
 *
 *   'response' (default, TRIAL): balasan dikembalikan di HTTP response
 *              webhook, lalu gateway (Fonnte/Wablas/Baileys wrapper) yang
 *              mengirimkannya. Tidak perlu call API keluar -> 100% gratis.
 *
 *   'cloud'  (PRODUKSI): kirim aktif via WhatsApp Cloud API resmi (Meta).
 *              Balasan (service message, dalam window 24 jam) gratis.
 *
 * Route memanggil sendReply(); saat pindah provider cukup ubah env,
 * logika bisnis tidak berubah.
 */
import { humanDelayMs, sleep, varyReply } from './anti-ban'

export type SendResult = { delivered: boolean; inlineReply?: string }

export async function sendReply(to: string, text: string): Promise<SendResult> {
  const provider = process.env.WA_PROVIDER ?? 'response'

  if (provider === 'cloud') {
    const token = process.env.WA_CLOUD_TOKEN
    const phoneId = process.env.WA_CLOUD_PHONE_ID
    if (!token || !phoneId) {
      throw new Error('WA_CLOUD_TOKEN / WA_CLOUD_PHONE_ID belum di-set.')
    }
    // Anti-ban: jeda menyerupai manusia + teks tak byte-identical.
    await sleep(humanDelayMs())
    text = varyReply(text)
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      },
    )
    return { delivered: res.ok }
  }

  // Mode 'response': gateway yang kirim; kita cukup titipkan teksnya.
  return { delivered: false, inlineReply: text }
}
