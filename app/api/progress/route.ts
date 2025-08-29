import { NextRequest, NextResponse } from 'next/server'
import { getBoard, updateProgress } from '../../../lib/store'
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

    const safeOpens = sim.revealedCount || 0
    const totalClicks = moves.length
    const durationMs = Number(duration_ms) || 0

    const scoreNow = computeScore(board.params, durationMs, totalClicks, safeOpens, false)
    let delta = Math.max(0, scoreNow - (board.scorePrev || 0))

    const MIN_DELTA = 5
    if (delta < MIN_DELTA) {
      updateProgress(boardId, { lastSafeOpens: safeOpens, lastTotalClicks: totalClicks, lastDurationMs: durationMs })
      return NextResponse.json({ ok: true, queued: true, delta: 0 })
    }

    if (!passesGuards({ duration_ms: durationMs, moves, scoreDelta: delta })) {
      return NextResponse.json({ error: 'guard_tripped', diag: { durationMs, totalClicks, delta } }, { status: 429 })
    }

    const tx = await writeUpdatePlayerData(player, BigInt(delta), 1n)
    updateProgress(boardId, {
      scorePrev: (board.scorePrev || 0) + delta,
      lastSafeOpens: safeOpens,
      lastTotalClicks: totalClicks,
      lastDurationMs: durationMs
    })
    return NextResponse.json({ ok: true, delta, tx })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
