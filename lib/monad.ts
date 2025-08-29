// lib/monad.ts
import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const CONTRACT = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4' as `0x${string}`

export const abi = parseAbi([
  'function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount)',
  'function registerGame(address _game, string _name, string _image, string _url)'
])

function chainFromEnv() {
  const id = Number(process.env.CHAIN_ID || 10143) // Monad testnet
  const rpc = process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz'
  return {
    id,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } }
  } as const
}

const ONCHAIN_ENABLED =
  String(process.env.SUBMIT_ONCHAIN ?? 'false').toLowerCase() === 'true'
export function onchainEnabled() { return ONCHAIN_ENABLED }

function getPk(): `0x${string}` {
  const raw = (process.env.GAME_SIGNER_PK || '').trim()
  if (!raw) throw new Error('Missing GAME_SIGNER_PK in .env.local')
  const pk = raw.startsWith('0x') ? raw : ('0x' + raw)
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    const len = pk.replace(/^0x/, '').length
    throw new Error(`Invalid GAME_SIGNER_PK: need 64 hex (32 bytes). Got ${len}.`)
  }
  return pk as `0x${string}`
}

/**
 * Gửi delta on-chain (khi SUBMIT_ONCHAIN=true).
 * - Nếu SUBMIT_ONCHAIN=false => trả '0xDRYRUN'
 * - Nếu revert (thường do chưa register game) => ném lỗi để route xử lý.
 */
export async function writeUpdatePlayerData(
  player: `0x${string}`,
  scoreDelta: bigint,
  txDelta: bigint
) {
  if (!ONCHAIN_ENABLED) return '0xDRYRUN'

  const pk = getPk()
  const account = privateKeyToAccount(pk)
  const client = createWalletClient({
    account,
    chain: chainFromEnv(),
    transport: http(process.env.MONAD_RPC)
  })

  try {
    const hash = await client.writeContract({
      address: CONTRACT,
      abi,
      functionName: 'updatePlayerData',
      args: [player, scoreDelta, txDelta]
    })
    return hash
  } catch (e: any) {
    // đẩy lỗi lên cho route: thường là revert do chưa register
    const msg = e?.shortMessage || e?.message || 'onchain_failed'
    throw new Error(msg)
  }
}
