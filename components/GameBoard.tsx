'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { computeScore } from '../lib/score'

type Difficulty = 'easy' | 'medium' | 'hard'
type StartResp = { boardId: string; seed: string; w: number; h: number; mines: number; boardHash: string }
type Move = { r: number; c: number; a: 'reveal' | 'flag' | 'unflag'; t: number }

function range(n: number){ return [...Array(n).keys()] }
function key(r:number,c:number){ return r+':'+c }
function fmt(n:number){ return Math.max(0, Math.floor(n)).toLocaleString() }
function paramsOf(g:StartResp){ return { w:g.w, h:g.h, mines:g.mines } }

export default function GameBoard({ player }: { player: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [game, setGame] = useState<StartResp | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [duration, setDuration] = useState(0)
  const [moves, setMoves] = useState<Move[]>([])
  const [state, setState] = useState<'idle'|'playing'|'win'|'lose'>('idle')

  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [flags, setFlags] = useState<Set<string>>(new Set())
  const [numbers, setNumbers] = useState<number[]>([])

  // Score / Best (local)
  const [currentScore, setCurrentScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [bestTime, setBestTime] = useState<number|null>(null)
  const bestKey = (d:Difficulty)=>`mm:best:${d}`
  const bestTimeKey = (d:Difficulty)=>`mm:bestTime:${d}`

  // Last status (progress/finish)
  const [lastStatus, setLastStatus] = useState<{ when:string, msg:string }|null>(null)

  useEffect(()=>{ try{
    const raw = localStorage.getItem(bestKey(difficulty))
    setBestScore(raw? JSON.parse(raw).score||0 : 0)
    const t = localStorage.getItem(bestTimeKey(difficulty))
    setBestTime(t? JSON.parse(t).sec : null)
  }catch{ setBestScore(0); setBestTime(null) } }, [difficulty])

  const layout = useMemo(()=>{
    if (!game || !Number.isFinite(game.w) || !Number.isFinite(game.h) || !Number.isFinite(game.mines) || !game.seed)
      return [] as boolean[]
    return generateLayout(game.w, game.h, game.mines, game.seed)
  },[game])

  useEffect(()=>{ if (game) setNumbers(computeNumbers(layout, game.w, game.h)) },[game, layout])

  useEffect(()=>{ if (state!=='playing') return
    const id = setInterval(()=> setDuration(Date.now()-startedAt), 100)
    return ()=> clearInterval(id)
  },[state, startedAt])

  // auto progress mỗi 7s
  useEffect(()=>{ if (state!=='playing') return
    const id = setInterval(()=>{ progress() }, 7000)
    return ()=> clearInterval(id)
  },[state, game, player, moves, startedAt])

  // điểm tạm thời
  useEffect(()=>{
    if (state==='playing' && game){
      const p = paramsOf(game)
      const score = computeScore(p as any, Date.now()-startedAt, moves.length, revealed.size, false)
      setCurrentScore(score)
    } else if (!game) setCurrentScore(0)
  },[state, game, startedAt, moves.length, revealed.size, duration])

  async function start(){
    if (!player){ alert('Cần địa chỉ ví để chơi.'); return }
    const res = await fetch('/api/new-board', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ difficulty, player }) })
    const data = await res.json()
    if (!res.ok || data?.error){ alert('Không tạo được ván mới: '+(data?.error||res.statusText)); return }
    if (!(typeof data.w==='number' && typeof data.h==='number' && typeof data.mines==='number' && data.seed && data.boardId)){
      alert('Dữ liệu ván không hợp lệ.'); return
    }
    setGame(data as StartResp)
    setRevealed(new Set()); setFlags(new Set()); setMoves([]); setDuration(0)
    setState('playing'); setStartedAt(Date.now()); setLastStatus(null); setCurrentScore(0)
  }

  function neighbors(r:number,c:number){
    const acc:[number,number][]=[]; if(!game) return acc
    for(let dr of [-1,0,1]) for(let dc of [-1,0,1]){
      if(dr===0 && dc===0) continue
      const nr=r+dr, nc=c+dc
      if(nr>=0 && nr<game.h && nc>=0 && nc<game.w) acc.push([nr,nc])
    }
    return acc
  }

  function onReveal(r:number,c:number){
    if(!game || state!=='playing') return
    const k=key(r,c); if(revealed.has(k) || flags.has(k)) return
    const t=Date.now()
    setMoves((m: Move[]): Move[] => {
  const next: Move[] = [...m, { r, c, a: 'reveal' as const, t }]
  if (next.length % 10 === 0) setTimeout(() => progress(), 0)
  return next
})

if (layout[r * game.w + c]) {
  setState('lose')
  setRevealed(new Set([...revealed, k]))
  const mv: Move[] = [...moves, { r, c, a: 'reveal' as const, t }]
  finish('lose', mv)
  return
}

    const stack:[[number,number]]|[number,number][]= [[r,c]]; const newRev=new Set(revealed)
    while(stack.length){
      const [rr,cc]=stack.pop()!; const kk=key(rr,cc); if(newRev.has(kk)) continue
      newRev.add(kk)
      const val=numbers[rr*game.w+cc]
      if(val===0) for(const [nr,nc] of neighbors(rr,cc)){
        const k2=key(nr,nc)
        if(!newRev.has(k2) && !layout[nr*game.w+nc]) stack.push([nr,nc])
      }
    }
    setRevealed(newRev)
    const safeCells=game.w*game.h - game.mines
    if (newRev.size >= safeCells) {
  setState('win')
  const mv: Move[] = [...moves, { r, c, a: 'reveal' as const, t }]
  finish('win', mv)
}

  function onRightClick(e:React.MouseEvent,r:number,c:number){
    e.preventDefault(); if(!game || state!=='playing') return
    const k=key(r,c); const t=Date.now()
    if(flags.has(k)){
      const n=new Set(flags); n.delete(k); setFlags(n)
      setMoves((m: Move[]): Move[] => {
  const next: Move[] = [...m, { r, c, a: 'unflag' as const, t }]
  if (next.length % 10 === 0) setTimeout(() => progress(), 0)
  return next
})

    }else if(!revealed.has(k)){
      const n=new Set(flags); n.add(k); setFlags(n)
      setMoves((m: Move[]): Move[] => {
  const next: Move[] = [...m, { r, c, a: 'flag' as const, t }]
  if (next.length % 10 === 0) setTimeout(() => progress(), 0)
  return next
})

    }
  }

  async function finish(_result:'win'|'lose', mv:Move[]){
    if(!game) return
    const p=paramsOf(game)
    const finalScore=computeScore(p as any, Date.now()-startedAt, mv.length, revealed.size, _result==='win')
    setCurrentScore(finalScore)
    const timeSec=(Date.now()-startedAt)/1000
    // update local bests
    if(finalScore>bestScore){ setBestScore(finalScore); try{ localStorage.setItem(bestKey(difficulty), JSON.stringify({score:finalScore, at:Date.now()})) }catch{} }
    if(_result==='win' && (!bestTime || timeSec<bestTime)){ setBestTime(timeSec); try{ localStorage.setItem(bestTimeKey(difficulty), JSON.stringify({sec:timeSec, at:Date.now()})) }catch{} }

    try{
      const r=await fetch('/api/finish',{ method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ boardId:game.boardId, player, moves:mv, duration_ms: Date.now()-startedAt })
      })
      const j=await r.json()
      if(!r.ok){ setLastStatus({ when:new Date().toLocaleTimeString(), msg:`Finish ❌ ${j?.error||r.statusText}` }); return }
      const txt = j.tx ? `tx=${String(j.tx).slice(0,10)}…` : 'no-tx'
      setLastStatus({ when:new Date().toLocaleTimeString(), msg:`Finish ✅ isWin=${j.isWin} +${j.scoreDelta} (${txt})` })
    }catch(e){ setLastStatus({ when:new Date().toLocaleTimeString(), msg:'Finish ❌ network error' }) }
  }

  async function progress(){
    if(!game || !player || state!=='playing') return
    try{
      const r=await fetch('/api/progress',{ method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ boardId:game.boardId, player, moves, duration_ms: Date.now()-startedAt })
      })
      const j=await r.json()
      if(r.ok && j.delta>0){
        const txt=j.tx?`tx=${String(j.tx).slice(0,10)}…`: ''
        setLastStatus({ when:new Date().toLocaleTimeString(), msg:`Progress ✅ +${j.delta} ${txt}` })
      }
    }catch{}
  }

  const gridCols = game ? `repeat(${game.w}, var(--cell))` : `repeat(9, var(--cell))`

  return (
    <section
  className="game-card"
  data-diff={difficulty}
  style={{ ['--cols' as any]: String(game?.w ?? 9) }}  // thêm dòng này
>
      {/* Card header */}
      <div className="card-head">
        <div className="chip"><span>Score</span> <b>{fmt(currentScore)}</b></div>
        <a className="chip ghost" href="/leaderboard">Leaderboard</a>
        <div className="chip"><span>Best</span> <b>{fmt(bestScore)}</b></div>
      </div>

      {/* meta row */}
      <div className="meta">
        <select value={difficulty} onChange={(e)=>setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">Easy (9x9, 10 mines)</option>
          <option value="medium">Medium (16x16, 40 mines)</option>
          <option value="hard">Hard (30x16, 99 mines)</option>
        </select>
        <span><b>Time:</b> {(duration/1000).toFixed(1)}s</span>
        <span><b>Best Time:</b> {bestTime? `${bestTime.toFixed(1)}s` : '—'}</span>
        <span><b>Status:</b> {state}</span>
      </div>

      {/* Board */}
{game && layout.length > 0 && (
  <div className="board-viewport">
    <div className="board" style={{ gridTemplateColumns: gridCols }}>
      {range(game.h).flatMap((r) =>
        range(game.w).map((c) => {
          const k = key(r, c)
          const isMine = layout[r * game.w + c]
          const isRevealed = revealed.has(k)
          const isFlag = flags.has(k)
          const n = numbers[r * game.w + c] || 0
          return (
            <div
              key={k}
              className={`cell ${isRevealed ? 'revealed' : isFlag ? 'flag' : 'hidden'}`}
              onClick={() => onReveal(r, c)}
              onContextMenu={(e) => onRightClick(e, r, c)}
            >
              {isRevealed ? (isMine ? '💣' : n > 0 ? n : '') : isFlag ? '🚩' : ''}
            </div>
          )
        })
      )}
    </div>
  </div>
)}


      {/* Buttons like mockup */}
      <div className="card-actions">
        <button className="btn" onClick={start} disabled={!player}>{state==='playing'?'New Game':'New Game'}</button>
        <button className="btn ghost" onClick={progress} disabled={!player || state!=='playing'}>Save Score</button>
      </div>

      {/* Status line */}
      {lastStatus && <div className="last"><b>Last:</b> {lastStatus.msg} <span style={{opacity:.6}}>@{lastStatus.when}</span> &nbsp;|&nbsp;
        <a href="https://testnet.monadexplorer.com/address/0xceCBFF203C8B6044F52CE23D914A1bfD997541A4?tab=Contract" target="_blank" rel="noreferrer">Contract</a>
      </div>}
    </section>
  )
}

/* ==== Helpers (unchanged) ==== */
function xmur3(str: string){ let h=1779033703 ^ str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h ^ str.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19) } return function(){ h=Math.imul(h ^ (h>>>16),2246822507); h=Math.imul(h ^ (h>>>13),3266489909); h^=h>>>16; return h>>>0 } }
function mulberry32(a:number){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t ^ (t>>>15), t|1); t^= t + Math.imul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296 } }
export function generateLayout(w:number,h:number,mines:number,seed:string){ const total=w*h; const layout=Array(total).fill(false) as boolean[]; const seedInt=xmur3(seed)(); const rnd=mulberry32(seedInt); const idx=Array.from({length:total},(_,i)=>i); for(let i=0;i<mines;i++){ const j=i+Math.floor(rnd()*(total-i)); const tmp=idx[i]; idx[i]=idx[j]; idx[j]=tmp; layout[idx[i]]=true } return layout }
export function computeNumbers(layout:boolean[],w:number,h:number){ const arr=new Array(w*h).fill(0); for(let r=0;r<h;r++) for(let c=0;c<w;c++){ const i=r*w+c; if(layout[i]){ arr[i]=-1; continue } let cnt=0; for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++){ if(dr===0&&dc===0) continue; const nr=r+dr, nc=c+dc; if(nr>=0&&nr<h&&nc>=0&&nc<w&&layout[nr*w+nc]) cnt++ } arr[i]=cnt } return arr }
