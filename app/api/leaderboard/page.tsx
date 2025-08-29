'use client'
import { useEffect, useState } from 'react'

type Row = { rank: number; username: string; walletShort: string; value: number }

export default function LeaderboardPage(){
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'transactions'|'scores'>('transactions')

  useEffect(()=>{
    setLoading(true)
    fetch(`/api/leaderboard/global?metric=${metric}`, { cache: 'no-store' })
      .then(r=>r.json())
      .then(j => setRows(Array.isArray(j?.data) ? j.data : []))
      .catch(()=> setRows([]))
      .finally(()=> setLoading(false))
  }, [metric])

  return (
    <div className="container" style={{maxWidth:900}}>
      <h2 style={{fontWeight:900, margin:'10px 0 12px'}}>Global Leaderboard (on-chain)</h2>

      {/* Nút chuyển chỉ số */}
      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <select value={metric} onChange={(e)=> setMetric(e.target.value as any)}>
          <option value="transactions">Transactions</option>
          <option value="scores">Scores (if available)</option>
        </select>
        <a className="chip ghost" href="https://monad-games-id-site.vercel.app/leaderboard" target="_blank" rel="noreferrer">Open Official Leaderboard</a>
      </div>

      {/* Iframe embed (nếu site cho phép) */}
      <div style={{borderRadius:14, overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,.08)', marginBottom:16}}>
        <iframe
          src="https://monad-games-id-site.vercel.app/leaderboard"
          style={{width:'100%', height:520, border:'none'}}
          title="Monad Global Leaderboard"
        />
      </div>

      {/* Fallback snapshot (scrape) */}
      <h3 style={{fontWeight:900, margin:'12px 0 6px'}}>Top Snapshot</h3>
      {loading ? <div>Loading…</div> : (
        <ol>
          {rows.map(r=>(
            <li key={r.rank} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,.08)'}}>
              <span><b>#{r.rank}</b> {r.username || '—'} &nbsp; <span style={{opacity:.7}}>{r.walletShort}</span></span>
              <b>{r.value.toLocaleString()}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
