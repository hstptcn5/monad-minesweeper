
export type Params = { w: number, h: number, mines: number }
export function computeScore(params: Params, duration_ms: number, totalClicks: number, safeOpens: number, isWin: boolean) {
  const base = (params.w*params.h - params.mines)
  const speed = Math.max(0, 300000 - duration_ms) // up to 5 minutes
  const acc = totalClicks > 0 ? Math.floor((safeOpens/totalClicks) * 50) : 0
  const winBonus = isWin ? (100 + params.mines) : 0
  let scoreDelta = (isWin ? base : Math.floor(base*0.2)) + Math.floor(speed/1000) + acc + winBonus
  // clamp
  scoreDelta = Math.max(0, Math.min(scoreDelta, 800))
  return scoreDelta
}
