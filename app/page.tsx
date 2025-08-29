'use client'
import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useRef, useState } from 'react'
import GameBoard from '../components/GameBoard'

function pickWallets(user: any): { cross?: string; any?: string } {
  if (!user?.linkedAccounts) return {}
  const crossAcc = user.linkedAccounts.find(
    (a: any) => a.type === 'cross_app' && a.providerApp?.id === 'cmd8euall0037le0my79qpz42'
  )
  const cross = crossAcc?.embeddedWallets?.[0]?.address

  const anyAcc =
    user.linkedAccounts.find((a: any) => a.address?.startsWith?.('0x')) ||
    user.linkedAccounts.find((a: any) => a.wallet?.address?.startsWith?.('0x')) ||
    user.linkedAccounts.find((a: any) => a.embeddedWallets?.[0]?.address?.startsWith?.('0x'))
  const any =
    anyAcc?.address || anyAcc?.wallet?.address || anyAcc?.embeddedWallets?.[0]?.address

  return { cross, any }
}

export default function Page() {
  const { authenticated, user, ready, login, logout } = usePrivy()
  const [addr, setAddr] = useState<string>('')          // ví đang hiển thị (ưu tiên cross-app)
  const [username, setUsername] = useState<string>('')  // @username nếu có
  const [loadingName, setLoadingName] = useState<boolean>(false)
  const [copyToast, setCopyToast] = useState<string>('')

  // polling
  const pollingId = useRef<ReturnType<typeof setInterval> | null>(null)
  const fastPollId = useRef<ReturnType<typeof setInterval> | null>(null)
  const fastPollUntil = useRef<number>(0)

  // Resolve địa chỉ lúc đăng nhập/đổi user
  useEffect(() => {
    if (ready && authenticated && user) {
      const p = pickWallets(user)
      setAddr(p.cross || p.any || '')
    } else {
      setAddr(''); setUsername('')
    }
  }, [ready, authenticated, user])

  async function fetchUsernameFor(address: string) {
    if (!address) { setUsername(''); return }
    try {
      setLoadingName(true)
      const r = await fetch(`/api/lookup-username?wallet=${address}&_t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (j?.hasUsername && j.user?.username) setUsername(j.user.username)
      else setUsername('')
    } catch {
      // giữ im lặng, không ném lỗi để tránh toast đỏ
    } finally {
      setLoadingName(false)
    }
  }

  // fetch khi có addr
  useEffect(() => { if (addr) fetchUsernameFor(addr) }, [addr])

  // refresh khi focus
  useEffect(() => {
    function onFocus() { if (addr) fetchUsernameFor(addr) }
    function onVis() { if (document.visibilityState === 'visible' && addr) fetchUsernameFor(addr) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis) }
  }, [addr])

  // Poll chậm 15s tới khi có username
  useEffect(() => {
    if (!authenticated || !addr) return
    if (username) { if (pollingId.current) { clearInterval(pollingId.current); pollingId.current = null }; return }
    if (pollingId.current) clearInterval(pollingId.current)
    pollingId.current = setInterval(() => { fetchUsernameFor(addr) }, 15000)
    return () => { if (pollingId.current) { clearInterval(pollingId.current); pollingId.current = null } }
  }, [authenticated, addr, username])

  // Fast polling 2 phút sau khi bấm claim
  function startFastPolling() {
    fastPollUntil.current = Date.now() + 2 * 60 * 1000
    if (fastPollId.current) clearInterval(fastPollId.current)
    fastPollId.current = setInterval(() => {
      if (Date.now() > fastPollUntil.current || username) {
        if (fastPollId.current) { clearInterval(fastPollId.current); fastPollId.current = null }
        return
      }
      // mỗi vòng chọn lại ví cross-app (phòng user vừa link xong)
      const p = pickWallets(user)
      const candidate = p.cross || p.any || addr
      if (candidate && candidate !== addr) setAddr(candidate)
      fetchUsernameFor(candidate)
    }, 2000)
  }

  function onClaimClick(e: React.MouseEvent) {
    e.preventDefault()
    window.open('https://monad-games-id-site.vercel.app/', '_blank', 'noopener,noreferrer')
    startFastPolling()
  }

  // Utilities
  const shortAddr = addr ? `${addr.slice(0,4)}${addr.slice(4,6)}…${addr.slice(-4)}` : ''
  function copy(text: string, label = 'Copied!') {
    if (!text) return
    try { navigator.clipboard?.writeText(text) } catch {}
    setCopyToast(label)
    setTimeout(() => setCopyToast(''), 1200)
  }
  async function onRefreshClick() {
    // mỗi lần Refresh: chọn lại ví cross-app trước rồi lookup
    const p = pickWallets(user)
    const candidate = p.cross || p.any || addr
    if (candidate !== addr) setAddr(candidate)
    await fetchUsernameFor(candidate)
  }

  return (
    <div className="container">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand">
          <div className="logo-badge"><div className="diamond" /></div>
          <div className="title">Monad Minesweeper</div>
        </div>

        <div className="pills">
          {!authenticated ? (
            <button className="pill" onClick={login}>Sign in with Monad Games ID</button>
          ) : (
            <>
              <button className="pill ghost" onClick={() => copy(addr, 'Wallet copied')}>
                <span className="muted">Wallet:</span>
                <span className="mono">{shortAddr}</span>
              </button>

              {username ? (
                <button className="pill ghost" onClick={() => copy(`@${username}`, 'Username copied')}>
                  <span className="muted">@</span><span>{username}</span>
                </button>
              ) : (
                <button className="pill outline" onClick={onClaimClick} disabled={loadingName}>
                  Claim username
                </button>
              )}

              <button className="pill outline" onClick={onRefreshClick} disabled={loadingName}>
                Refresh
              </button>
              <button className="pill small outline" onClick={logout}>Disconnect</button>
            </>
          )}
        </div>
      </header>

      {/* GAME */}
      {authenticated ? (
        <GameBoard player={addr} />
      ) : (
        <div style={{ padding: 16, opacity: .9 }}>
          Đăng nhập bằng Monad Games ID để chơi và lưu điểm.
        </div>
      )}

      {copyToast && <div className="copy-ok">{copyToast}</div>}
    </div>
  )
}
