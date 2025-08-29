import { NextRequest, NextResponse } from 'next/server'
import { generateLayout, hashBoard, type Params } from '../../../lib/sim'
import crypto from 'crypto'
import { setBoard } from '../../../lib/store'

function pickParams(diff: string): Params {
  if (diff === 'hard') return { w: 30, h: 16, mines: 99 }
  if (diff === 'medium') return { w: 16, h: 16, mines: 40 }
  return { w: 9, h: 9, mines: 10 }
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty, player } = await req.json()
    if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 })

    const params = pickParams(difficulty || 'easy')
    const seed = crypto.randomUUID()
    const layout = generateLayout(params.w, params.h, params.mines, seed)
    const boardHash = hashBoard(params, seed, layout)
    const boardId = crypto.randomUUID()

    setBoard(boardId, {
      player,
      params,
      seed,
      boardHash,
      createdAt: Date.now(),
      scorePrev: 0,
      lastSafeOpens: 0,
      lastTotalClicks: 0,
      lastDurationMs: 0
    })

    return NextResponse.json({ boardId, seed, ...params, boardHash })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
