// lib/board.ts
function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLayout(w: number, h: number, mines: number, seed: string) {
  const total = w * h
  const layout = Array(total).fill(false) as boolean[]
  const seedInt = xmur3(seed)()
  const rnd = mulberry32(seedInt)
  const idx = Array.from({ length: total }, (_, i) => i)
  for (let i = 0; i < mines; i++) {
    const j = i + Math.floor(rnd() * (total - i))
    const tmp = idx[i]
    idx[i] = idx[j]
    idx[j] = tmp
    layout[idx[i]] = true
  }
  return layout
}

export function computeNumbers(layout: boolean[], w: number, h: number) {
  const arr = new Array(w * h).fill(0)
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      const i = r * w + c
      if (layout[i]) {
        arr[i] = -1
        continue
      }
      let cnt = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr,
            nc = c + dc
          if (nr >= 0 && nr < h && nc >= 0 && nc < w && layout[nr * w + nc]) cnt++
        }
      arr[i] = cnt
    }
  return arr
}
