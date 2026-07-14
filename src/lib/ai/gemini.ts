// Inti pemanggil Gemini: rotasi banyak API key (acak) + rantai model +
// hemat token (thinking mati, output dibatasi). Dipakai oleh interpret.ts
// (teks) dan receipt.ts (gambar/struk).

const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite', // RPD 500 — paling lega
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
]

function modelChain(): string[] {
  const raw = process.env.GEMINI_MODELS
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean)
  const first = process.env.GEMINI_MODEL?.trim()
  const chain = first ? [first, ...DEFAULT_MODELS] : [...DEFAULT_MODELS]
  return [...new Set(chain)]
}

function apiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS
  if (multi) return multi.split(',').map((s) => s.trim()).filter(Boolean)
  const single = process.env.GEMINI_API_KEY?.trim()
  return single ? [single] : []
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function aiEnabled(): boolean {
  return process.env.AI_PROVIDER === 'gemini' && apiKeys().length > 0
}

async function callModel(
  model: string,
  key: string,
  parts: unknown[],
  maxOutput: number,
): Promise<{ retry: boolean; text: string | null }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
            maxOutputTokens: maxOutput,
            thinkingConfig: { thinkingBudget: 0 }, // hemat token + cepat
          },
        }),
      },
    )
    if ([429, 500, 502, 503, 404, 401, 403].includes(res.status)) return { retry: true, text: null }
    if (!res.ok) return { retry: false, text: null }
    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return { retry: false, text: text ?? null }
  } catch {
    return { retry: true, text: null } // timeout/jaringan -> coba kombinasi lain
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Panggil Gemini dengan bagian (parts) apa pun — teks dan/atau gambar.
 * Coba key (acak) × model sampai berhasil; kembalikan teks JSON mentah, atau
 * null kalau semua gagal (pemanggil lalu jatuh ke rule-based).
 */
export async function askGeminiParts(
  parts: unknown[],
  maxOutput = 150,
): Promise<string | null> {
  if (!aiEnabled()) return null
  const models = modelChain()
  for (const key of shuffle(apiKeys())) {
    for (const model of models) {
      const { retry, text } = await callModel(model, key, parts, maxOutput)
      if (text) return text
      if (!retry) return null
    }
  }
  return null
}

export function askGemini(prompt: string, maxOutput = 120): Promise<string | null> {
  return askGeminiParts([{ text: prompt }], maxOutput)
}

/** Ambil objek dari JSON (buang bungkus array kalau ada). */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const p = JSON.parse(text)
    const o = Array.isArray(p) ? p[0] : p
    return o && typeof o === 'object' ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}
