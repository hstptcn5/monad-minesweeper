// app/layout.tsx
import './globals.css'
import Providers from './providers'
import SiteFooter from '../components/SiteFooter'

export const metadata = {
  title: 'Monad Minesweeper',
  description: 'Minesweeper with Monad Games ID + onchain leaderboard'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="layout">                {/* <-- thêm class */}
        <Providers>
          <main className="page">{children}</main>   {/* <-- bọc bằng main */}
        </Providers>
        <SiteFooter />
      </body>
    </html>
  )
}
