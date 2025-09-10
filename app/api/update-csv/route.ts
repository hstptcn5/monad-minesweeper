// app/api/update-csv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { refreshCache, getCacheInfo } from '@/lib/leaderboard-cache'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Force refreshing cache...')
    
    // Force refresh cache
    const freshData = await refreshCache()
    
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      data: freshData.data,
      total: freshData.total,
      lastUpdated: freshData.lastUpdated,
      source: freshData.source
    })
    
  } catch (error) {
    console.error('❌ Error refreshing cache:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting cache info...')
    
    const cacheInfo = getCacheInfo()
    
    return NextResponse.json({
      success: true,
      cacheInfo,
      message: cacheInfo.exists ? 'Cache exists' : 'No cache found'
    })
    
  } catch (error) {
    console.error('❌ Error getting cache info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get cache info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
