import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_PRIVY_APP_ID: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    CHAIN_ID: process.env.CHAIN_ID,
    MONAD_RPC: process.env.MONAD_RPC,
    SUBMIT_ONCHAIN: process.env.SUBMIT_ONCHAIN,
    GAME_SIGNER_PK_PRESENT: Boolean(process.env.GAME_SIGNER_PK),
  })
}
