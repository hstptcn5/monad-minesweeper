// app/api/finish/route.ts
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getBoard, markFinished, updateProgress } from '../../../lib/store'
import { simulate } from '../../../lib/sim'
import { computeScore } from '../../../lib/score'
import { passesGuards } from '../../../lib/guards'
import { writeUpdatePlayerData } from '../../../lib/monad' // hàm ký tx on-chain (viem)

function isHexAddress(addr: unknown): addr is `0x${string}` {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export async function POST(req: NextRequest) {
  try {
    const { boardId, player, moves, duration_ms } = await req.json()

    if (!boardId || !player || !Array.isArray(moves)) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }
    if (!isHexAddress(player)) {
      return NextResponse.json({ error: 'invalid player address' }, { status: 400 })
    }

    // Cho phép cả store sync/async
    const board = await Promise.resolve(getBoard(boardId))
    if (!board) {
      return NextResponse.json({ error: 'board not found or expired' }, { status: 400 })
    }
    if (String(board.player).toLowerCase() !== String(player).toLowerCase()) {
      return NextResponse.json({ error: 'player mismatch' }, { status: 400 })
    }

    // Mô phỏng ván & hợp lệ nước đi
    const sim = simulate(board.params, board.seed, moves)
    if (!sim.valid) {
      return NextResponse.json(
        { error: 'invalid moves', diag: { simState: sim.state } },
        { status: 400 }
      )
    }

    const isWin = sim.state === 'WIN'
    const totalClicks = moves.length
    const safeOpens = sim.revealedCount || 0
    const durationMs = Number(duration_ms) || 0

    // Tính điểm cuối và delta so với lần trước (luôn là số nguyên >= 0)
    const finalScore = Math.floor(
      computeScore(board.params, durationMs, totalClicks, safeOpens, isWin)
    )
    const prev = Math.floor(board.scorePrev || 0)
    const delta = Math.max(0, finalScore - prev)

    // Nếu có điểm tăng, chạy guard
    if (delta > 0) {
      const ok = passesGuards({ duration_ms: durationMs, moves, scoreDelta: delta })
      if (!ok) {
        return NextResponse.json(
          { error: 'guard_tripped', diag: { durationMs, totalClicks, delta } },
          { status: 429 }
        )
      }
    }

    // Gửi on-chain: chỉ khi thắng và có delta > 0
    let tx: string | null = null
    if (isWin && delta > 0) {
      if (process.env.SUBMIT_ONCHAIN === 'true') {
        // gọi contract thật
        tx = await writeUpdatePlayerData(player, BigInt(delta), 1n)
      } else {
        // dry-run (không tốn gas khi bạn chưa bật on-chain)
        tx = '0xDRYRUN'
      }
    }

    // Cập nhật tiến độ & đánh dấu kết thúc
    await Promise.resolve(updateProgress(boardId, { scorePrev: prev + delta }))
    await Promise.resolve(markFinished(boardId))

    return NextResponse.json({
      ok: true,
      isWin,
      scoreDelta: delta,
      tx,
      diag: {
        simState: sim.state,
        safeOpens,
        totalClicks,
        durationMs,
        finalScore,
        prev
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'finish failed' }, { status: 500 })
  }
}
