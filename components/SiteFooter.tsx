'use client'

export default function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="brandline">© {year} Monad Games ID</div>

      <div className="social-pills">
        {/* GitHub */}
        <a
          className="pill-icon"
          href="https://github.com/hstptcn5"      // <- đổi link của bạn
          target="_blank" rel="noreferrer" aria-label="GitHub"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor"
              d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.41-1.34-1.79-1.34-1.79-1.09-.75.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.9 0-1.3.47-2.36 1.24-3.19-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.22a11.4 11.4 0 0 1 6 0c2.29-1.54 3.3-1.22 3.3-1.22.66 1.64.24 2.86.12 3.16.77.83 1.24 1.89 1.24 3.19 0 4.58-2.81 5.6-5.49 5.9.44.38.83 1.12.83 2.26v3.35c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/>
          </svg>
        </a>

        {/* X (Twitter) */}
        <a
          className="pill-icon"
          href="https://x.com/yoshinokuna"               // <- đổi link
          target="_blank" rel="noreferrer" aria-label="X"
          title="X (Twitter)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M18.146 2H21l-6.5 7.43L22.5 22h-6.4l-5.01-6.53L4.3 22H1.45l6.96-7.96L1 2h6.5l4.53 6.04L18.15 2Zm-1.12 18h2.08L7.03 4H4.95l12.07 16Z"/>
          </svg>
        </a>

        {/* Discord */}
        <a
          className="pill-icon"
          href="https://discord.com/users/769751442482266132"   // hoặc invite server
          target="_blank" rel="noreferrer" aria-label="Discord"
          title="Discord"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20.3 4.37A17 17 0 0 0 16.74 3l-.18.35a13 13 0 0 1 2.7.94c-1.25-.58-2.56-.99-3.93-1.22A12.4 12.4 0 0 0 12 3c-1.1 0-2.18.12-3.22.35-1.37.23-2.68.64-3.93 1.22.9-.42 1.79-.72 2.7-.94L7.37 3A17 17 0 0 0 3.7 4.37C1.64 7.35.9 10.5 1.12 13.63a17 17 0 0 0 4.92 2.52l.45-.73c-.76-.28-1.48-.63-2.16-1.05.83.39 1.69.7 2.58.92.88.21 1.77.34 2.68.4.13 0 .26.03.4.03.93.07 1.86.07 2.8 0l.4-.03c.9-.06 1.8-.19 2.68-.4.88-.22 1.75-.53 2.58-.92-.68.42-1.4.77-2.16 1.05l.45.73a17 17 0 0 0 4.92-2.52c.22-3.12-.52-6.28-2.59-9.26ZM9.5 12.5c-.66 0-1.2-.62-1.2-1.38 0-.77.54-1.39 1.2-1.39s1.2.62 1.2 1.39c0 .76-.54 1.38-1.2 1.38Zm5 0c-.66 0-1.2-.62-1.2-1.38 0-.77.54-1.39 1.2-1.39s1.2.62 1.2 1.39c0 .76-.54 1.38-1.2 1.38Z"/>
          </svg>
        </a>

        {/* Telegram */}
        <a
          className="pill-icon"
          href="https://t.me/berion2102"          // <- đổi link
          target="_blank" rel="noreferrer" aria-label="Telegram"
          title="Telegram"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M9.04 16.32 8.9 20c.35 0 .5-.15.69-.33l1.66-1.59 3.44 2.52c.63.35 1.1.17 1.28-.58L19.9 4.74c.21-.96-.35-1.33-.96-1.1L3.6 9.85c-.92.35-.9.86-.16 1.1l4.1 1.28 9.5-5.98c.45-.28.86-.12.52.16l-7.7 6.9Z"/>
          </svg>
        </a>
      </div>
    </footer>
  )
}
