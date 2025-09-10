import { NextResponse } from 'next/server'
import { getGameLeaderboardFromMonadAPI } from '@/lib/monad'

export async function GET() {
  try {
    console.log('🧪 Testing Monad API directly...')
    
    const data = await getGameLeaderboardFromMonadAPI(231, 10)
    
    return NextResponse.json({
      success: true,
      message: 'Monad API test successful',
      data: data,
      count: data.length
    })
    
  } catch (error) {
    console.error('❌ Monad API test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
