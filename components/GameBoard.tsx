'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { computeScore } from '../lib/score'
import { generateLayout, computeNumbers } from '../lib/board'

type Difficulty = 'easy' | 'medium' | 'hard'
type StartResp = { boardId: string; seed: string; w: number; h: number; mines: number; boardHash: string }
type Move = { r: number; c: number; a: 'reveal' | 'flag' | 'unflag'; t: number }

function range(n: number) { return [...Array(n).keys()] }
function key(r: number, c: number) { return r + ':' + c }
function fmt(n: number) { return Math.max(0, Math.floor(n)).toLocaleString() }
function paramsOf(g: StartResp) { return { w: g.w, h: g.h, mines: g.mines } }

export default function GameBoard({ player }: { player: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [game, setGame] = useState<StartResp | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [duration, setDuration] = useState(0)
  const [moves, setMoves] = useState<Move[]>([])
  const [state, setState] = useState<'idle' | 'playing' | 'win' | 'lose'>('idle')

  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [flags, setFlags] = useState<Set<string>>(new Set())
  const [numbers, setNumbers] = useState<number[]>([])

  // Score / Best (local)
  const [currentScore, setCurrentScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [bestTime, setBestTime] = useState<number | null>(null)
  const bestKey = (d: Difficulty) => `mm:best:${d}`
  const bestTimeKey = (d: Difficulty) => `mm:bestTime:${d}`

  // Last status (progress/finish)
  const [lastStatus, setLastStatus] = useState<{ when: string, msg: string } | null>(null)

  // Mini leaderboard data
  const [miniLeaderboard, setMiniLeaderboard] = useState<Array<{
    rank: number;
    player: string;
    score: number;
  }>>([])

  // Fetch mini leaderboard data
  const fetchMiniLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard/minesweeper?sortBy=scores')
      const result = await response.json()
      
      if (result.success && result.data) {
        const topPlayers = result.data.slice(0, 3).map((entry: any, index: number) => ({
          rank: index + 1,
          player: entry.player || entry.username || `Player${index + 1}`,
          score: entry.score || 0
        }))
        setMiniLeaderboard(topPlayers)
      }
    } catch (error) {
      console.error('❌ Failed to fetch mini leaderboard:', error)
      // Fallback to mock data
      setMiniLeaderboard([
        { rank: 1, player: 'Player1', score: 1234 },
        { rank: 2, player: 'Player2', score: 1100 },
        { rank: 3, player: 'Player3', score: 987 }
      ])
    }
  }, [])

  // Auto-refresh leaderboard function
  const refreshLeaderboard = useCallback(async () => {
    try {
      console.log('🔄 Auto-refreshing leaderboard...')
      
      // Check for new data first
      try {
        const checkResponse = await fetch('/api/check-new-data', { method: 'POST' })
        const checkResult = await checkResponse.json()
        
        if (checkResult.success && checkResult.hasNewData) {
          console.log(`✅ Found ${checkResult.newTransactions} new transactions`)
          console.log(`📊 Leaderboard updated: ${checkResult.currentTotal} → ${checkResult.newTotal}`)
        } else {
          console.log('✅ No new data found, using cached data')
        }
      } catch (e) {
        console.log('⚠️ Check new data failed, continuing with leaderboard refresh')
      }
      
      // Sau đó refresh leaderboard
      const response = await fetch('/api/leaderboard/minesweeper')
      const result = await response.json()
      console.log('✅ Leaderboard refreshed:', result)
      
      // Also refresh mini leaderboard
      await fetchMiniLeaderboard()
    } catch (error) {
      console.error('❌ Error refreshing leaderboard:', error)
    }
  }, [fetchMiniLeaderboard])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(bestKey(difficulty))
      setBestScore(raw ? JSON.parse(raw).score || 0 : 0)
      const t = localStorage.getItem(bestTimeKey(difficulty))
      setBestTime(t ? JSON.parse(t).sec : null)
    } catch {
      setBestScore(0); setBestTime(null)
    }
  }, [difficulty])

  const layout = useMemo(() => {
    if (!game || !Number.isFinite(game.w) || !Number.isFinite(game.h) || !Number.isFinite(game.mines) || !game.seed)
      return [] as boolean[]
    return generateLayout(game.w, game.h, game.mines, game.seed)
  }, [game])

  useEffect(() => { if (game) setNumbers(computeNumbers(layout, game.w, game.h)) }, [game, layout])

  useEffect(() => {
    if (state !== 'playing') return
    const id = setInterval(() => setDuration(Date.now() - startedAt), 100)
    return () => clearInterval(id)
  }, [state, startedAt])

  // auto progress mỗi 7s
  useEffect(() => {
    if (state !== 'playing') return
    const id = setInterval(() => { progress() }, 7000)
    return () => clearInterval(id)
  }, [state, game, player, moves, startedAt])

  // điểm tạm thời
  useEffect(() => {
    if (state === 'playing' && game) {
      const p = paramsOf(game)
      const score = computeScore(p as any, Date.now() - startedAt, moves.length, revealed.size, false)
      setCurrentScore(score)
    } else if (!game) setCurrentScore(0)
  }, [state, game, startedAt, moves.length, revealed.size, duration])

  const start = useCallback(async () => {
    if (!player) { alert('Cần địa chỉ ví để chơi.'); return }
    const res = await fetch('/api/new-board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ difficulty, player }) })
    const data = await res.json()
    if (!res.ok || data?.error) { alert('Không tạo được ván mới: ' + (data?.error || res.statusText)); return }
    if (!(typeof data.w === 'number' && typeof data.h === 'number' && typeof data.mines === 'number' && data.seed && data.boardId)) {
      alert('Dữ liệu ván không hợp lệ.'); return
    }
    setGame(data as StartResp)
    setRevealed(new Set()); setFlags(new Set()); setMoves([]); setDuration(0)
    setState('playing'); setStartedAt(Date.now()); setLastStatus(null); setCurrentScore(0)
  }, [player, difficulty])

  // Handle difficulty change with auto-restart
  const handleDifficultyChange = useCallback(async (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    // Auto-restart game when difficulty changes
    if (player && state !== 'idle') {
      // Reset current game state
      setGame(null)
      setRevealed(new Set())
      setFlags(new Set())
      setMoves([])
      setDuration(0)
      setState('idle')
      setStartedAt(0)
      setLastStatus(null)
      setCurrentScore(0)
      
      // Start new game with new difficulty
      setTimeout(async () => {
        const res = await fetch('/api/new-board', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ difficulty: newDifficulty, player }) 
        })
        const data = await res.json()
        if (res.ok && !data?.error && typeof data.w === 'number' && typeof data.h === 'number' && typeof data.mines === 'number' && data.seed && data.boardId) {
          setGame(data as StartResp)
          setState('playing')
          setStartedAt(Date.now())
        }
      }, 100) // Small delay to ensure state is reset
    }
  }, [player, state])

  // Tự động start game khi có player và chưa có game
  useEffect(() => {
    if (player && !game && state === 'idle') {
      start()
    }
  }, [player, game, state, start])

  // Fetch mini leaderboard on mount
  useEffect(() => {
    fetchMiniLeaderboard()
  }, [fetchMiniLeaderboard])

  function neighbors(r: number, c: number) {
    const acc: [number, number][] = []; if (!game) return acc
    for (let dr of [-1, 0, 1]) for (let dc of [-1, 0, 1]) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < game.h && nc >= 0 && nc < game.w) acc.push([nr, nc])
    }
    return acc
  }

  function onReveal(r: number, c: number) {
    if (!game || state !== 'playing') return
    const k = key(r, c); if (revealed.has(k) || flags.has(k)) return
    const t = Date.now()

    setMoves((m: Move[]): Move[] => {
      const next: Move[] = [...m, { r, c, a: 'reveal', t }]
      if (next.length % 10 === 0) setTimeout(() => progress(), 0)
      return next
    })

    if (layout[r * game.w + c]) {
      setState('lose'); setRevealed(new Set([...revealed, k]))
      const mv: Move[] = [...moves, { r, c, a: 'reveal', t }]
      finish('lose', mv)
      return
    }

    const stack: [number, number][] = [[r, c]]
    const newRev = new Set(revealed)
    while (stack.length) {
      const [rr, cc] = stack.pop()!; const kk = key(rr, cc); if (newRev.has(kk)) continue
      newRev.add(kk)
      const val = numbers[rr * game.w + cc]
      if (val === 0) for (const [nr, nc] of neighbors(rr, cc)) {
        const k2 = key(nr, nc)
        if (!newRev.has(k2) && !layout[nr * game.w + nc]) stack.push([nr, nc])
      }
    }
    setRevealed(newRev)
    const safeCells = game.w * game.h - game.mines
    if (newRev.size >= safeCells) {
      setState('win')
      const mv: Move[] = [...moves, { r, c, a: 'reveal', t }]
      finish('win', mv)
    }
  }

  function onRightClick(e: React.MouseEvent, r: number, c: number) {
    e.preventDefault(); if (!game || state !== 'playing') return
    const k = key(r, c); const t = Date.now()
    if (flags.has(k)) {
      const n = new Set(flags); n.delete(k); setFlags(n)
      setMoves((m: Move[]): Move[] => {
        const next: Move[] = [...m, { r, c, a: 'unflag', t }]
        if (next.length % 10 === 0) setTimeout(() => progress(), 0)
        return next
      })
    } else if (!revealed.has(k)) {
      const n = new Set(flags); n.add(k); setFlags(n)
      setMoves((m: Move[]): Move[] => {
        const next: Move[] = [...m, { r, c, a: 'flag', t }]
        if (next.length % 10 === 0) setTimeout(() => progress(), 0)
        return next
      })
    }
  }

  async function finish(_result: 'win' | 'lose', mv: Move[]) {
    if (!game) return
    const p = paramsOf(game)
    const finalScore = computeScore(p as any, Date.now() - startedAt, mv.length, revealed.size, _result === 'win')
    setCurrentScore(finalScore)
    const timeSec = (Date.now() - startedAt) / 1000
    // update local bests
    if (_result === 'win' && finalScore > bestScore) {
      setBestScore(finalScore); try { localStorage.setItem(bestKey(difficulty), JSON.stringify({ score: finalScore, at: Date.now() })) } catch { }
    }
    if (_result === 'win' && (!bestTime || timeSec < bestTime)) {
      setBestTime(timeSec); try { localStorage.setItem(bestTimeKey(difficulty), JSON.stringify({ sec: timeSec, at: Date.now() })) } catch { }
    }

    try {
      const r = await fetch('/api/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: game.boardId, player, moves: mv, duration_ms: Date.now() - startedAt })
      })
      const j = await r.json()
      if (!r.ok) { setLastStatus({ when: new Date().toLocaleTimeString(), msg: `Finish ❌ ${j?.error || r.statusText}` }); return }
      const txt = j.tx ? `tx=${String(j.tx).slice(0, 10)}…` : 'no-tx'
      setLastStatus({ when: new Date().toLocaleTimeString(), msg: `Finish ✅ isWin=${j.isWin} +${j.scoreDelta} (${txt})` })
    } catch (e) { setLastStatus({ when: new Date().toLocaleTimeString(), msg: 'Finish ❌ network error' }) }
  }

  async function progress() {
    if (!game || !player || state !== 'playing') return
    try {
      const r = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: game.boardId, player, moves, duration_ms: Date.now() - startedAt })
      })
      const j = await r.json()
      if (r.ok && j.delta > 0) {
        const txt = j.tx ? `tx=${String(j.tx).slice(0, 10)}…` : ''
        setLastStatus({ when: new Date().toLocaleTimeString(), msg: `Progress ✅ +${j.delta} ${txt}` })
      }
    } catch { }
  }

  const gridCols = game ? `repeat(${game.w}, var(--cell))` : `repeat(9, var(--cell))`

  return (
    <div className="game-layout">

      {/* Main Game Area */}
      <section
        className="game-card"
        data-diff={difficulty}
        data-state={state}
        style={{ ['--cols' as any]: String(game?.w ?? 9) }}
      >
      {/* Card header */}
      <div className="card-head">
        <div className="chip" data-high-score={currentScore > bestScore && bestScore > 0}>
          <span>Score</span> <b>{fmt(currentScore)}</b>
        </div>
        <a 
          className="chip ghost" 
          href="/leaderboard"
          onClick={refreshLeaderboard}
        >
          Leaderboard
        </a>
        <div className="chip"><span>Best</span> <b>{fmt(bestScore)}</b></div>
      </div>

      {/* meta row */}
      <div className="meta">
        <select value={difficulty} onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}>
          <option value="easy">Easy (9x9, 10 mines)</option>
          <option value="medium">Medium (16x16, 40 mines)</option>
          <option value="hard">Hard (30x16, 99 mines)</option>
        </select>
        <span><b>Time:</b> {(duration / 1000).toFixed(1)}s</span>
        <span><b>Best Time:</b> {bestTime ? `${bestTime.toFixed(1)}s` : '—'}</span>
        <span><b>Status:</b> <span className={`status-${state}`}>{state}</span></span>
      </div>

      {/* Board */}
      {game && layout.length > 0 && (
        <div className="board-viewport">
          <div className="board" style={{ gridTemplateColumns: gridCols }}>
            {range(game.h).flatMap(r =>
              range(game.w).map(c => {
                const k = key(r, c)
                const isMine = layout[r * game.w + c]
                const isRevealed = revealed.has(k)
                const isFlag = flags.has(k)
                const n = numbers[r * game.w + c] || 0
                return (
                  <div key={k}
                    className={`cell ${isRevealed ? 'revealed' : isFlag ? 'flag' : 'hidden'}`}
                    data-number={isRevealed && n > 0 ? n : undefined}
                    data-mine={isRevealed && isMine ? 'true' : undefined}
                    onClick={() => onReveal(r, c)}
                    onContextMenu={(e) => onRightClick(e, r, c)}
                  >
                    {isRevealed ? (
                      isMine ? (
                        <span className="icon-bomb">
                          <span className="fuse"></span>
                          <span className="flame"></span>
                        </span>
                      ) : (n > 0 ? n : '')
                    ) : (
                      isFlag ? <span className="icon-flag"></span> : ''
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="card-actions">
        <button className="btn" onClick={start} disabled={!player}>
          {state === 'playing' ? 'New Game' : 'Start Game'}
        </button>
        <button className="btn ghost" onClick={progress} disabled={!player || state !== 'playing'}>Save Score</button>
      </div>

      {/* Status line */}
      {lastStatus && <div className="last"><b>Last:</b> {lastStatus.msg} <span style={{ opacity: .6 }}>@{lastStatus.when}</span> &nbsp;|&nbsp;
        <a href="https://testnet.monadexplorer.com/address/0xceCBFF203C8B6044F52CE23D914A1bfD997541A4?tab=Contract" target="_blank" rel="noreferrer">Contract</a>
      </div>}
      </section>

      {/* Right Sidebar - Leaderboard & Social */}
      <aside className="game-sidebar right">
        <div className="sidebar-section">
          <h3>Leaderboard</h3>
          <div className="mini-leaderboard">
            {miniLeaderboard.map((entry) => (
              <div key={entry.rank} className="leaderboard-item">
                <span className="rank">{entry.rank}</span>
                <span className="player">{entry.player}</span>
                <span className="score">{fmt(entry.score)}</span>
              </div>
            ))}
            <div className="leaderboard-item current">
              <span className="rank">—</span>
              <span className="player">You</span>
              <span className="score">{fmt(currentScore)}</span>
            </div>
          </div>
          <a href="/leaderboard" className="btn btn-sm outline" onClick={refreshLeaderboard}>
            View Full
          </a>
        </div>

        <div className="sidebar-section">
          <h3>Your Progress</h3>
          <div className="progress-item">
            <span className="progress-label">Current Rank</span>
            <span className="progress-value">#42</span>
          </div>
          <div className="progress-item">
            <span className="progress-label">Games Played</span>
            <span className="progress-value">15</span>
          </div>
          <div className="progress-item">
            <span className="progress-label">Win Rate</span>
            <span className="progress-value">73%</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Social</h3>
          <button className="btn btn-sm" onClick={() => navigator.share?.({ title: 'Monad Minesweeper', text: `I scored ${fmt(currentScore)} points!` })}>
            Share Score
          </button>
          <button className="btn btn-sm outline">
            Challenge
          </button>
        </div>
      </aside>
    </div>
  )
}
