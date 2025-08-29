'use client'

export default function LeaderboardPage() {
  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <h2 style={{ fontWeight: 900, margin: '8px 0 12px' }}>
        Global Leaderboard (on-chain)
      </h2>

      {/* Embed bảng xếp hạng chính thức */}
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,.08)',
          background: 'white',
        }}
      >
        <iframe
          title="Monad Global Leaderboard"
          src="https://monad-games-id-site.vercel.app/leaderboard"
          style={{ width: '100%', height: 680, border: 'none' }}
        />
      </div>

      <p style={{ opacity: 0.7, marginTop: 10, fontSize: 13 }}>
        * Khi bạn bật <code>SUBMIT_ONCHAIN=true</code> và đã <b>registerGame</b>,
        điểm thắng của người chơi sẽ được đẩy on-chain và bảng ở trên sẽ phản ánh.
      </p>
    </div>
  )
}
