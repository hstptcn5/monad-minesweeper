// app/api/leaderboard/global/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'
// metric=transactions | scores (mặc định: transactions)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const metric = (searchParams.get('metric') || 'transactions').toLowerCase()

    // 1) fetch HTML từ leaderboard chính thức
    const url = 'https://monad-games-id-site.vercel.app/leaderboard'
    const r = await fetch(url, { cache: 'no-store' })
    const html = await r.text()

    // 2) parse HTML để lấy các dòng top
    const $ = cheerio.load(html)

    // Cách parse “tương đối”: tìm tất cả dòng có chứa ví (link tới explorer)
    // rồi lấy text theo cột. Trang chính thức có 2 tab (“Transactions” và “Scores”),
    // mặc định render “Transactions”. Nếu metric=scores mà trang không render,
    // ta vẫn trả được dữ liệu transactions làm fallback.
    type Row = { rank: number; username: string; walletShort: string; value: number }
    const rows: Row[] = []

    // Tìm các hàng (tr/row) bằng cách dò anchor có domain explorer
    $('a[href*="testnet.monadexplorer.com"]').each((_, a) => {
      const row = $(a).closest('tr')
      if (!row || row.length === 0) return

      // Cột rank: thường là “1st/2nd/…th” -> lấy số
      let rankText = row.find('td,th').first().text().trim()
      const rank = Number(rankText.replace(/\D+/g, '')) || 0

      // Cột username: lấy ô kế tiếp có chữ (không phải ví)
      // Dò hết cells, pick cell có chữ != ví rút gọn
      const cells = row.find('td,th').toArray().map(td => $(td).text().trim()).filter(Boolean)

      // ví rút gọn là kiểu 0xABCD…EF, lấy từ text của anchor
      const walletShort = $(a).text().trim()

      // đoán username là cell đứng ngay trước wallet hoặc ngay sau rank
      let username = ''
      const walletIdx = cells.findIndex(c => c.includes('0x') && c.includes('…'))
      if (walletIdx > 0) username = cells[walletIdx - 1] || ''
      if (!username && cells.length >= 2) username = cells[1] // sau rank

      // giá trị (Transactions hoặc Scores) thường là số ở cuối hàng
      let val = 0
      for (let i = cells.length - 1; i >= 0; i--) {
        const n = Number(cells[i].replace(/,/g, ''))
        if (!Number.isNaN(n) && n > 0) { val = n; break }
      }

      if (rank && walletShort && val) {
        rows.push({ rank, username, walletShort, value: val })
      }
    })

    // sort an toàn theo rank tăng dần
    rows.sort((a,b)=> a.rank - b.rank)

    return NextResponse.json({
      ok: true,
      metric,                         // 'transactions' (mặc định). Nếu muốn scores, khi site render tab Scores server-side thì cũng parse được.
      source: 'https://monad-games-id-site.vercel.app/leaderboard',
      count: rows.length,
      data: rows.slice(0, 50)         // trả tối đa 50 cho nhẹ
    })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'leaderboard_fetch_failed' })
  }
}
