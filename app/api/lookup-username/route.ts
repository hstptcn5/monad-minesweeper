// app/api/lookup-username/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const walletRaw = (searchParams.get('wallet') || '').trim().toLowerCase()

  // Không trả 400 nữa — luôn 200 để UI không hiện error toast
  if (!/^0x[0-9a-fA-F]{40}$/.test(walletRaw)) {
    return NextResponse.json({ hasUsername: false, user: null, reason: 'invalid_wallet' })
  }

  try {
    const api = `https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${walletRaw}`
    const r = await fetch(api, { cache: 'no-store' })
    const data = await r.json().catch(() => null)

    const ok = Boolean(data && data.hasUsername && data.user?.username)
    const user = ok
      ? { id: data.user.id, username: String(data.user.username), walletAddress: walletRaw }
      : null

    return NextResponse.json({ hasUsername: ok, user })
  } catch (e: any) {
    return NextResponse.json({ hasUsername: false, user: null, reason: 'lookup_failed' })
  }
}
