
import { z } from 'zod'

export const MoveZ = z.object({
  r: z.number().int().nonnegative(),
  c: z.number().int().nonnegative(),
  a: z.enum(['reveal', 'flag', 'unflag']),
  t: z.number().int().nonnegative()
})
export const MovesZ = z.array(MoveZ).max(10000)

export function passesGuards({ duration_ms, moves, scoreDelta }: { duration_ms: number, moves: z.infer<typeof MoveZ>[], scoreDelta: number }) {
  if (duration_ms < 500) return false
  // clicks per second
  const cps = moves.length / Math.max(1, duration_ms/1000)
  if (cps > 20) return false
  // score sanity
  if (scoreDelta > 800 || scoreDelta < 0) return false
  return true
}
