// app/api/check-new-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCachedLeaderboard, mergeNewData } from '@/lib/leaderboard-cache'
import { getGameLeaderboard } from '@/lib/monad'

// Game address của Minesweeper game
const MINESWEEPER_GAME_ADDRESS = '0x7d5aaba426231c649142330421acbb2a8a37b65e'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checking for new data...')
    
    // Lấy dữ liệu hiện tại từ cache
    const currentCache = await getCachedLeaderboard()
    console.log(`📊 Current cache: ${currentCache.total} entries`)
    
    // Lấy dữ liệu mới từ blockchain (chỉ lấy gần đây)
    console.log('🔍 Fetching recent blockchain data...')
    const recentBlockchainData = await getGameLeaderboard(MINESWEEPER_GAME_ADDRESS, 100)
    
    if (recentBlockchainData.length === 0) {
      console.log('⚠️ No blockchain data found')
      return NextResponse.json({
        success: true,
        message: 'No new data found',
        currentTotal: currentCache.total,
        newTotal: currentCache.total,
        hasNewData: false
      })
    }
    
    // So sánh với cache hiện tại
    const currentWallets = new Set(currentCache.data.map(entry => entry.wallet))
    const newTransactions = recentBlockchainData.filter(entry => 
      !currentWallets.has(entry.wallet) || 
      currentCache.data.find(cached => 
        cached.wallet === entry.wallet && 
        cached.score !== entry.score
      )
    )
    
    if (newTransactions.length === 0) {
      console.log('✅ No new transactions found')
      return NextResponse.json({
        success: true,
        message: 'No new data found',
        currentTotal: currentCache.total,
        newTotal: currentCache.total,
        hasNewData: false
      })
    }
    
    console.log(`🆕 Found ${newTransactions.length} new/updated transactions`)
    
    // Merge dữ liệu mới
    const updatedCache = await mergeNewData(newTransactions)
    
    return NextResponse.json({
      success: true,
      message: `Found and merged ${newTransactions.length} new transactions`,
      currentTotal: currentCache.total,
      newTotal: updatedCache.total,
      hasNewData: true,
      newTransactions: newTransactions.length,
      lastUpdated: updatedCache.lastUpdated
    })
    
  } catch (error) {
    console.error('❌ Error checking for new data:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check for new data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting current data status...')
    
    const currentCache = await getCachedLeaderboard()
    
    return NextResponse.json({
      success: true,
      currentTotal: currentCache.total,
      lastUpdated: currentCache.lastUpdated,
      source: currentCache.source,
      message: `Current leaderboard has ${currentCache.total} entries`
    })
    
  } catch (error) {
    console.error('❌ Error getting data status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get data status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
