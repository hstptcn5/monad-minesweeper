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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/leaderboard/minesweeper')
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

    fetchData()
  }, [])

  const sortedData = [...data].sort((a, b) => {
    if (metric === 'scores') {
      return b.score - a.score
    } else {
      return b.games - a.games
    }
  })

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      {/* Header với nút Back to Game */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontWeight: 900, margin: 0 }}>
          Minesweeper Leaderboard (on-chain)
        </h2>
        <Link 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#6366f1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          ← Back to Game
        </Link>
      </div>

      {/* Metric Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '12px', 
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => setMetric('scores')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: metric === 'scores' ? '#6366f1' : 'transparent',
              color: metric === 'scores' ? 'white' : '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Scores
          </button>
          <button
            onClick={() => setMetric('games')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: metric === 'games' ? '#6366f1' : 'transparent',
              color: metric === 'games' ? 'white' : '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Games
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,.08)',
          background: 'white',
        }}
      >
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Rank</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Player</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Wallet</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                    {metric === 'scores' ? 'Score' : 'Games'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((entry, index) => (
                  <tr 
                    key={entry.rank} 
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: index < 3 ? '#fef3c7' : 'white'
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '600' }}>
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && '#'}
                      {entry.rank}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '500' }}>
                      {entry.player.startsWith('0x') ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                          {entry.player}
                        </span>
                      ) : (
                        <span style={{ color: '#6366f1', fontWeight: '600' }}>
                          @{entry.player}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px', color: '#6b7280' }}>
                      {entry.wallet}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>
                      {metric === 'scores' ? entry.score.toLocaleString() : entry.games.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer với nút Back to Game */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <Link 
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            textDecoration: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            border: '2px solid #e5e7eb'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb'
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.transform = 'translateY(0)'
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
