import { NextRequest, NextResponse } from 'next/server'
import { getBoard, markFinished, updateProgress } from '../../../lib/store'
import { simulate } from '../../../lib/sim'
import { computeScore } from '../../../lib/score'
import { passesGuards } from '../../../lib/guards'
import { writeUpdatePlayerData } from '../../../lib/monad'

export async function POST(req: NextRequest) {
  try {
    const { boardId, player, moves, duration_ms } = await req.json()
    if (!boardId || !player || !moves) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const board = getBoard(boardId)
    if (!board) return NextResponse.json({ error: 'board not found or expired' }, { status: 400 })
    if (board.player.toLowerCase() !== String(player).toLowerCase()) {
      return NextResponse.json({ error: 'player mismatch' }, { status: 400 })
    }

    const sim = simulate(board.params, board.seed, moves)
    if (!sim.valid) return NextResponse.json({ error: 'invalid moves', diag: { simState: sim.state } }, { status: 400 })

    const isWin = sim.state === 'WIN'
    const totalClicks = moves.length
    const safeOpens = sim.revealedCount || 0
    const durationMs = Number(duration_ms) || 0

    const finalScore = computeScore(board.params, durationMs, totalClicks, safeOpens, isWin)
    let delta = Math.max(0, finalScore - (board.scorePrev || 0))

    if (delta > 0) {
      if (!passesGuards({ duration_ms: durationMs, moves, scoreDelta: delta })) {
        return NextResponse.json({ error: 'guard_tripped', diag: { durationMs, totalClicks, delta } }, { status: 429 })
      }
      const tx = await writeUpdatePlayerData(player as `0x${string}`, BigInt(delta), 1n)
      updateProgress(boardId, { scorePrev: (board.scorePrev || 0) + delta })
      markFinished(boardId)
      return NextResponse.json({
        ok: true,
        isWin,
        scoreDelta: delta,
        tx,
        diag: { simState: sim.state, safeOpens, totalClicks, durationMs, finalScore, prev: board.scorePrev || 0 }
      })
    } else {
      markFinished(boardId)
      return NextResponse.json({
        ok: true,
        isWin,
        scoreDelta: 0,
        diag: { simState: sim.state, safeOpens, totalClicks, durationMs, finalScore, prev: board.scorePrev || 0 }
      })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
