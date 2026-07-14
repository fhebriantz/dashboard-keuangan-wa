// Parser angka dalam kata Bahasa Indonesia -> nominal.
// Contoh: "dua puluh ribu" -> 20000, "seratus ribu" -> 100000,
//         "satu juta lima ratus ribu" -> 1500000, "goceng" -> 5000.
// Tanpa AI — murni aturan.

const UNIT: Record<string, number> = {
  nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4,
  lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
}

// Slang nominal (nilai langsung).
const SLANG: Record<string, number> = {
  gocap: 50, cepek: 100, gopek: 500, seceng: 1000,
  goceng: 5000, ceban: 10000, goban: 50000, cepekribu: 100000,
}

const SCALE = new Set(['belas', 'puluh', 'ratus', 'ribu', 'juta'])
const SE_SCALE = /^se(puluh|belas|ratus|ribu|juta)$/

function isNumWord(t: string): boolean {
  return t in UNIT || t in SLANG || SCALE.has(t) || SE_SCALE.test(t)
}

// Apakah run mengandung skala/slang (agar "satu bakso" tak dikira Rp1).
function hasScale(tokens: string[]): boolean {
  return tokens.some((t) => SCALE.has(t) || SE_SCALE.test(t) || t in SLANG)
}

function computeRun(tokens: string[]): number {
  const ex: string[] = []
  for (const t of tokens) {
    if (SE_SCALE.test(t)) ex.push('satu', t.slice(2))
    else ex.push(t)
  }
  let result = 0, group = 0, lastUnit = 0, slang = 0
  for (const t of ex) {
    if (t in UNIT) lastUnit = UNIT[t]
    else if (t in SLANG) slang += SLANG[t]
    else if (t === 'belas') { group += 10 + lastUnit; lastUnit = 0 }
    else if (t === 'puluh') { group += (lastUnit || 1) * 10; lastUnit = 0 }
    else if (t === 'ratus') { group += (lastUnit || 1) * 100; lastUnit = 0 }
    else if (t === 'ribu') { group += lastUnit; result += (group || 1) * 1000; group = 0; lastUnit = 0 }
    else if (t === 'juta') { group += lastUnit; result += (group || 1) * 1000000; group = 0; lastUnit = 0 }
  }
  return result + group + lastUnit + slang
}

/**
 * Cari angka-kata dalam teks. Return nominal + potongan teks yang cocok
 * (untuk dihapus dari nama), atau null jika tidak ada.
 */
export function parseIndoNumber(text: string): { nominal: number; matched: string } | null {
  const re = /[a-zA-Z]+/g
  const toks: { w: string; s: number; e: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    toks.push({ w: m[0].toLowerCase(), s: m.index, e: m.index + m[0].length })
  }

  let best: { nominal: number; matched: string } | null = null
  let i = 0
  while (i < toks.length) {
    if (!isNumWord(toks[i].w)) { i++; continue }
    let j = i
    while (j < toks.length && isNumWord(toks[j].w)) j++
    const run = toks.slice(i, j)
    const words = run.map((r) => r.w)
    if (hasScale(words)) {
      const nominal = computeRun(words)
      if (nominal > 0 && (!best || nominal > best.nominal)) {
        best = { nominal, matched: text.slice(run[0].s, run[run.length - 1].e) }
      }
    }
    i = j
  }
  return best
}
