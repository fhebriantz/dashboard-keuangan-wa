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
}

export function normalizeInbound(body: Record<string, any>): InboundMessage | null {
  // Bentuk resmi WhatsApp Cloud API (Meta) — nested.
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
  return { sender: String(sender ?? ''), message: String(message ?? '') }
}
