/**
 * Normalisasi payload masuk dari berbagai gateway WA menjadi bentuk seragam.
 *
 * Tiap gateway kirim field beda-beda:
 *   - Fonnte:            { sender, message }
 *   - Wablas:            { phone, message }
 *   - Baileys (wrapper): { from, text } / { sender, body }
 *   - WhatsApp Cloud API: entry[].changes[].value.messages[0] { from, text.body }
 *
 * Dengan menormalkan di satu tempat, GANTI gateway = tidak menyentuh
 * logika bisnis di route. Inilah "seam" migrasi trial -> berbayar.
 */
export type InboundMessage = {
  sender: string
  message: string
  imageUrl?: string // ada jika pesan berupa foto (mis. struk)
}

export function normalizeInbound(body: Record<string, any>): InboundMessage | null {
  // Bentuk resmi WhatsApp Cloud API (Meta) — nested (gambar butuh unduh via Graph, dilewati).
  const cloud = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (cloud) {
    return {
      sender: String(cloud.from ?? ''),
      message: String(cloud.text?.body ?? cloud.button?.text ?? ''),
    }
  }

  // Bentuk flat (Fonnte / Wablas / Baileys wrapper / dsb).
  const sender = body.sender ?? body.sender_number ?? body.phone ?? body.from
  const message = body.message ?? body.message_text ?? body.text ?? body.body
  if (sender == null && message == null) return null

  // Gambar/media: gateway isi salah satu field URL ini. Terima URL http apa
  // pun; tipe (image/…) divalidasi saat diunduh di aiReadReceipt.
  const media =
    body.url || body.media || body.imageUrl || body.image || body.file || body.attachment || body.mediaUrl
  let imageUrl: string | undefined
  if (media) {
    const u = String(media)
    if (/^https?:\/\//i.test(u)) imageUrl = u
  }

  return { sender: String(sender ?? ''), message: String(message ?? ''), imageUrl }
}
