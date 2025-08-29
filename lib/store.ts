import type { Params } from './sim'

export type BoardRecord = {
  player: string
  params: Params
  seed: string
  boardHash: string
  createdAt: number
  scorePrev: number
  lastSafeOpens: number
  lastTotalClicks: number
  lastDurationMs: number
}

// Dùng global để không mất dữ liệu khi HMR/route reload
declare global {
  // eslint-disable-next-line no-var
  var __MONAD_MINES_BOARDS: Map<string, BoardRecord> | undefined
}

const boards: Map<string, BoardRecord> =
  globalThis.__MONAD_MINES_BOARDS ?? new Map<string, BoardRecord>()
if (!globalThis.__MONAD_MINES_BOARDS) globalThis.__MONAD_MINES_BOARDS = boards

export function setBoard(id: string, rec: BoardRecord) { boards.set(id, rec) }
export function getBoard(id: string) { return boards.get(id) }
export function updateProgress(id: string, patch: Partial<BoardRecord>) {
  const b = boards.get(id); if (!b) return
  boards.set(id, { ...b, ...patch })
}
export function markFinished(id: string) { boards.delete(id) }
export function size() { return boards.size }
