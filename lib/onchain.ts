import { createWalletClient, http, parseAbi, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const CONTRACT = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4' as const

const abi = parseAbi([
  'function updatePlayerData(address player,uint256 scoreAmount,uint256 transactionAmount)'
])

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC!]} },
  blockExplorers: { default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' } }
})

export async function submitDeltaOnchain(params: {
  player: `0x${string}`;
  scoreDelta: number | bigint;
  txDelta?: number | bigint;
}) {
  const { player } = params
  const scoreDelta = BigInt(params.scoreDelta ?? 0)
  const txDelta    = BigInt(params.txDelta ?? 0)

  // DRY-RUN mode (không tốn gas)
  if (process.env.SUBMIT_ONCHAIN !== 'true') {
    return { mode: 'dryrun' as const, tx: '0xDRYRUN' }
  }

  const pk = process.env.GAME_SIGNER_PK
  const rpc = process.env.MONAD_RPC
  if (!pk || !rpc) throw new Error('Missing GAME_SIGNER_PK or MONAD_RPC')

  const account = privateKeyToAccount(pk as `0x${string}`)
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(rpc) })

  const hash = await wallet.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'updatePlayerData',
    args: [player, scoreDelta, txDelta]
  })

  return { mode: 'onchain' as const, tx: hash }
}
