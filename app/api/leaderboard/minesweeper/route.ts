import { NextRequest, NextResponse } from 'next/server'
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

// Fallback mock data nếu contract không có dữ liệu
const mockMinesweeperData: LeaderboardEntry[] = [
  { rank: 1, player: 'MineMaster', wallet: '0x1234...5678', score: 1250, games: 45 },
  { rank: 2, player: 'BombHunter', wallet: '0x2345...6789', score: 1180, games: 38 },
  { rank: 3, player: 'SafeSweeper', wallet: '0x3456...7890', score: 1100, games: 42 },
  { rank: 4, player: 'GridGuru', wallet: '0x4567...8901', score: 1050, games: 35 },
  { rank: 5, player: 'FlagFinder', wallet: '0x5678...9012', score: 980, games: 40 },
  { rank: 6, player: 'LuckyLuke', wallet: '0x6789...0123', score: 920, games: 33 },
  { rank: 7, player: 'QuickClick', wallet: '0x7890...1234', score: 880, games: 28 },
  { rank: 8, player: 'MinePro', wallet: '0x8901...2345', score: 850, games: 31 },
  { rank: 9, player: 'BombBuster', wallet: '0x9012...3456', score: 800, games: 25 },
  { rank: 10, player: 'SafeZone', wallet: '0x0123...4567', score: 750, games: 22 }
]

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Fetching Minesweeper leaderboard from game events...')
    console.log('Game address:', MINESWEEPER_GAME_ADDRESS)
    console.log('MONAD_RPC:', process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz (default)')
    
    // Ưu tiên lấy dữ liệu từ game events cụ thể
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
    
    // Fallback: Sử dụng mock data
    console.log('⚠️ No explorer data, using mock data')
    
    return NextResponse.json({
      success: true,
      data: mockMinesweeperData,
      total: mockMinesweeperData.length,
      game: 'minesweeper',
      source: 'mock'
    })
    
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error)
    
    // Fallback to mock data nếu có lỗi
    return NextResponse.json({
      success: true,
      data: mockMinesweeperData,
      total: mockMinesweeperData.length,
      game: 'minesweeper',
      source: 'mock',
      error: 'All fetch methods failed, using mock data'
    })
  }
}