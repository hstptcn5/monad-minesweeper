'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface LeaderboardEntry {
  rank: number
  player: string
  wallet: string
  score: number
  games: number
}

interface LeaderboardResponse {
  success: boolean
  data: LeaderboardEntry[]
  total: number
  game: string
  source: string
  gameAddress?: string
  lastUpdated?: string
  error?: string
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metric, setMetric] = useState<'scores' | 'games'>('scores')
  const [source, setSource] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = async (sortBy: 'scores' | 'transactions' = 'scores') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leaderboard/minesweeper?sortBy=${sortBy}`)
      const result: LeaderboardResponse = await response.json()
      
      if (result.success) {
        setData(result.data)
        setSource(result.source || 'unknown')
        setLastUpdated(result.lastUpdated || '')
      } else {
        setError(result.error || 'Failed to fetch leaderboard')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(metric === 'scores' ? 'scores' : 'transactions')
  }, [metric])

  const sortedData = [...data].sort((a, b) => {
    if (metric === 'scores') {
      return b.score - a.score
    } else {
      return b.games - a.games
    }
  })

  return (
    <div className="leaderboard-container">
      {/* Header với nút Back to Game */}
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">
          Minesweeper Leaderboard (on-chain)
        </h1>
        <Link 
          href="/"
          className="pill"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Game
        </Link>
      </div>

      {/* Metric Toggle */}
      <div className="leaderboard-tabs">
        <button
          onClick={() => setMetric('scores')}
          className={`leaderboard-tab ${metric === 'scores' ? 'active' : ''}`}
        >
          Scores
        </button>
        <button
          onClick={() => setMetric('games')}
          className={`leaderboard-tab ${metric === 'games' ? 'active' : ''}`}
        >
          Games
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="leaderboard-table">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading leaderboard...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', color: '#ef4444' }}>Error: {error}</div>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Wallet</th>
                  <th>
                    {metric === 'scores' ? 'Score' : 'Games'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((entry, index) => (
                  <tr key={entry.rank}>
                    <td>
                      <div className={`leaderboard-rank rank-${index + 1}`}>
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && '#'}
                        {entry.rank}
                      </div>
                    </td>
                    <td>
                      <div className="leaderboard-player">
                        {entry.player.startsWith('0x') ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                            {entry.player}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--chip)', fontWeight: '600' }}>
                            @{entry.player}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="leaderboard-wallet">
                        {entry.wallet}
                      </div>
                    </td>
                    <td>
                      <div className="leaderboard-score">
                        {metric === 'scores' ? entry.score.toLocaleString() : entry.games.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer với nút Back to Game */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
        <Link 
          href="/"
          className="pill outline"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎮 Back to Minesweeper Game
        </Link>
      </div>

      <div style={{ opacity: 0.7, marginTop: 16, fontSize: 13, textAlign: 'center' }}>
        <p>
          * Dữ liệu được lấy từ <strong>{source === 'csv-data' ? 'CSV (từ khi tạo game)' : source === 'game-events' ? 'blockchain events' : source === 'explorer-api' ? 'Explorer API' : 'mock data'}</strong>
        </p>
        {lastUpdated && (
          <p style={{ marginTop: 4 }}>
            Cập nhật lần cuối: {new Date(lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
        <p style={{ marginTop: 8 }}>
          Khi bạn chơi và submit score on-chain, bảng xếp hạng sẽ tự động cập nhật.
        </p>
      </div>
    </div>
  )
}
