
# Monad Minesweeper + Monad Games ID (Privy)

This is a minimal **Next.js (App Router) + TypeScript** project that demonstrates:
- Sign in with **Monad Games ID** (Privy Cross App ID)
- Minesweeper gameplay (client) with server-issued board seed
- Server verification of moves
- On-chain score submission via `updatePlayerData` (increment)
- Optional username check/redirect

> **Contract (testnet):** `0xceCBFF203C8B6044F52CE23D914A1bfD997541A4`  

## 1) Setup
```bash
pnpm i    # or npm i / yarn
cp .env.example .env.local
# Fill NEXT_PUBLIC_PRIVY_APP_ID and GAME_SIGNER_PK (server signer), etc.
```

## 2) Run
```bash
pnpm dev   # http://localhost:3000
```

## 3) Register your game (one-time, optional helper)
Edit `.env.local` (GAME_SIGNER, GAME_NAME, GAME_IMAGE, GAME_URL), then:
```bash
pnpm register:game
```

## 4) How it works
- Player logs in with Monad Games ID → embedded wallet address is used as `player`.
- Start a game → server generates `seed` and stores a board record in memory (for demo).
- Finish a game → client sends `moves` and `duration_ms` → **server simulates** to verify.
- If valid win, server computes `scoreDelta` and calls on-chain:
  `updatePlayerData(player, scoreDelta, 1)` → **incremental**.
- View on-chain totals on the ecosystem leaderboard site.

## Notes
- This sample keeps boards in-memory; for production, use a DB (Redis/Postgres).
- Anti-abuse checks are basic; extend `lib/guards.ts` as needed.
- Change scoring in `lib/score.ts`.
