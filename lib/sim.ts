
import crypto from 'crypto'

export type Params = { w: number, h: number, mines: number }
export type Move = { r: number, c: number, a: 'reveal'|'flag'|'unflag', t: number }

function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i=0; i<str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLayout(w: number, h: number, mines: number, seed: string): boolean[] {
  const total = w*h
  const layout = Array(total).fill(false) as boolean[]
  const seedInt = xmur3(seed)()
  const rnd = mulberry32(seedInt)
  const indices = Array.from({length: total}, (_,i)=>i)
  for (let i=0; i<mines; i++) {
    const j = i + Math.floor(rnd() * (total - i))
    const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp
    layout[indices[i]] = true
  }
  return layout
}

export function computeNumbers(layout: boolean[], w: number, h: number): number[] {
  const arr = new Array(w*h).fill(0)
  for (let r=0; r<h; r++) for (let c=0; c<w; c++) {
    const i = r*w + c
    if (layout[i]) { arr[i] = -1; continue }
    let cnt = 0
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if (dr===0 && dc===0) continue
      const nr = r+dr, nc = c+dc
      if (nr>=0 && nr<h && nc>=0 && nc<w && layout[nr*w+nc]) cnt++
    }
    arr[i] = cnt
  }
  return arr
}

export function hashBoard(params: Params, seed: string, layout: boolean[]) {
  const h = crypto.createHash('sha256')
  h.update(JSON.stringify({ params, seed, layout }))
  return '0x' + h.digest('hex')
}

export function simulate(params: Params, seed: string, moves: Move[]) {
  const layout = generateLayout(params.w, params.h, params.mines, seed)
  const numbers = computeNumbers(layout, params.w, params.h)
  const revealed = new Set<string>()
  const flags = new Set<string>()
  const key = (r:number,c:number)=>r+':'+c
  const totalSafe = params.w*params.h - params.mines

  const inBounds = (r:number,c:number) => r>=0 && r<params.h && c>=0 && c<params.w

  const neighbors = (r:number,c:number) => {
    const acc: [number, number][] = []
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if (dr===0 && dc===0) continue
      const nr=r+dr, nc=c+dc
      if (inBounds(nr,nc)) acc.push([nr,nc])
    }
    return acc
  }

  function floodOpen(r:number,c:number) {
    const stack: [number, number][] = [[r,c]]
    while (stack.length) {
      const [rr,cc] = stack.pop()!
      const kk = key(rr,cc)
      if (revealed.has(kk)) continue
      revealed.add(kk)
      if (numbers[rr*params.w + cc] === 0) {
        for (const [nr,nc] of neighbors(rr,cc)) {
          const k2 = key(nr,nc)
          if (!revealed.has(k2) && !layout[nr*params.w + nc]) stack.push([nr,nc])
        }
      }
    }
  }

  for (const m of moves) {
    if (!inBounds(m.r, m.c)) return { valid:false, state:'INVALID' as const }
    const kk = key(m.r,m.c)
    if (m.a === 'flag') {
      if (revealed.has(kk)) return { valid:false, state:'INVALID' as const }
      flags.add(kk)
    } else if (m.a === 'unflag') {
      flags.delete(kk)
    } else if (m.a === 'reveal') {
      if (flags.has(kk)) return { valid:false, state:'INVALID' as const }
      if (layout[m.r*params.w + m.c]) {
        // mine hit -> lose
        return { valid:true, state:'LOSE' as const, revealedCount: revealed.size }
      }
      floodOpen(m.r, m.c)
      if (revealed.size >= totalSafe) {
        return { valid:true, state:'WIN' as const, revealedCount: revealed.size }
      }
    }
  }
  // if ended without conclusion
  return { valid:true, state:'ONGOING' as const, revealedCount: revealed.size }
}
