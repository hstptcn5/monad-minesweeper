'use client'
import { PrivyProvider } from '@privy-io/react-auth'
import React from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  // Nếu chưa có appId ở build time (Preview chưa set ENV), đừng khởi tạo Privy
  if (!appId) return <>{children}</>

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // bạn có dùng Cross App ID của Monad Games ID ở đâu thì truyền trong config
        // crossAppId: 'cmd8euall0037le0my79qpz42',
        // các cấu hình khác...
      }}
    >
      {children}
    </PrivyProvider>
  )
}
