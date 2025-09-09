import { NextRequest, NextResponse } from 'next/server'
import { getGameLeaderboard } from '@/lib/monad'

const MINESWEEPER_GAME_ADDRESS = '0x7d5aaba426231c649142330421acbb2a8a37b65e'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Testing leaderboard fetch...')
    
    const result = await getGameLeaderboard(MINESWEEPER_GAME_ADDRESS, 10)
    
    return NextResponse.json({
      success: true,
      gameAddress: MINESWEEPER_GAME_ADDRESS,
      data: result,
      count: result.length,
      debug: {
        rpc: process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz (default)',
        chainId: process.env.CHAIN_ID || '10143 (default)'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Debug error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      debug: {
        rpc: process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz (default)',
        chainId: process.env.CHAIN_ID || '10143 (default)'
      }
    }, { status: 500 })
  }
}
