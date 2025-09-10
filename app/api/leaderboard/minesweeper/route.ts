import { NextRequest, NextResponse } from 'next/server'
import { getCachedLeaderboard, refreshCache } from '@/lib/leaderboard-cache'
import { getGameLeaderboard, getGameLeaderboardFromExplorerAPI } from '@/lib/monad'

// Game address của Minesweeper game
const MINESWEEPER_GAME_ADDRESS = '0x7d5aaba426231c649142330421acbb2a8a37b65e'

export interface LeaderboardEntry {
  rank: number
  player: string
  wallet: string
  score: number
  games: number
}

// Empty fallback data (no more mock data)
const emptyData: LeaderboardEntry[] = []

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Fetching Minesweeper leaderboard...')
    console.log('Game address:', MINESWEEPER_GAME_ADDRESS)
    
    // Lấy dữ liệu từ cache (nhanh nhất)
    console.log('📊 Getting cached leaderboard data...')
    const cachedData = await getCachedLeaderboard()
    
    if (cachedData.data.length > 0) {
      console.log('✅ Cached data found:', cachedData.data.length, 'entries')
      
      // Map cached data to LeaderboardEntry format
      const leaderboardData: LeaderboardEntry[] = cachedData.data.map(entry => ({
        rank: entry.rank,
        player: entry.player,
        wallet: entry.wallet,
        score: entry.score,
        games: entry.games
      }))
      
      return NextResponse.json({
        success: true,
        data: leaderboardData,
        total: leaderboardData.length,
        game: 'minesweeper',
        source: cachedData.source,
        gameAddress: MINESWEEPER_GAME_ADDRESS,
        lastUpdated: cachedData.lastUpdated
      })
    }
    
    // Fallback: Lấy dữ liệu từ blockchain events
    console.log('⚠️ No CSV data, trying blockchain events...')
    const gameData = await getGameLeaderboard(MINESWEEPER_GAME_ADDRESS, 50)
    
    if (gameData.length > 0) {
      console.log('✅ Game events data found:', gameData.length, 'entries')
      
      // Map game data to LeaderboardEntry format
      const leaderboardData: LeaderboardEntry[] = gameData.map(entry => ({
        rank: entry.rank,
        player: entry.username || entry.player, // Hiển thị username nếu có, fallback về địa chỉ ngắn
        wallet: entry.wallet,
        score: entry.score,
        games: entry.transactions // Sử dụng transactions làm games count
      }))
      
      return NextResponse.json({
        success: true,
        data: leaderboardData,
        total: leaderboardData.length,
        game: 'minesweeper',
        source: 'game-events',
        gameAddress: MINESWEEPER_GAME_ADDRESS
      })
    }
    
    // Fallback: Thử Explorer API approach
    console.log('⚠️ No game events data, trying Explorer API approach...')
    const explorerData = await getGameLeaderboardFromExplorerAPI(MINESWEEPER_GAME_ADDRESS, 50)
    
    if (explorerData.length > 0) {
      console.log('✅ Explorer API data found:', explorerData.length, 'entries')
      
      // Map explorer data to LeaderboardEntry format
      const leaderboardData: LeaderboardEntry[] = explorerData.map(entry => ({
        rank: entry.rank,
        player: entry.username || entry.player, // Hiển thị username nếu có, fallback về địa chỉ ngắn
        wallet: entry.wallet,
        score: entry.score,
        games: entry.transactions // Sử dụng transactions làm games count
      }))
      
      return NextResponse.json({
        success: true,
        data: leaderboardData,
        total: leaderboardData.length,
        game: 'minesweeper',
        source: 'explorer-api',
        gameAddress: MINESWEEPER_GAME_ADDRESS
      })
    }
    
    // Fallback: Trả về empty data
    console.log('⚠️ No data available, returning empty leaderboard')
    
    return NextResponse.json({
      success: true,
      data: emptyData,
      total: 0,
      game: 'minesweeper',
      source: 'empty',
      message: 'No leaderboard data available'
    })
    
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error)
    
    // Fallback to empty data nếu có lỗi
    return NextResponse.json({
      success: false,
      data: emptyData,
      total: 0,
      game: 'minesweeper',
      source: 'error',
      error: 'Failed to fetch leaderboard data'
    })
  }
}