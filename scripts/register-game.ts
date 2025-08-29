
import 'dotenv/config'
import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const CONTRACT = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4' as `0x${string}`
const abi = parseAbi([
  'function registerGame(address _game, string _name, string _image, string _url)'
])

function chainFromEnv() {
  const id = Number(process.env.CHAIN_ID || 10143)
  const rpc = process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz'
  return {
    id,
    name: 'Monad Testnet',
    nativeCurrency: { name:'MON', symbol:'MON', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } }
  } as const
}

async function main() {
  const pk = process.env.GAME_SIGNER_PK as `0x${string}`
  const gameSigner = process.env.GAME_SIGNER as `0x${string}`
  const name = process.env.GAME_NAME || 'Monad Minesweeper'
  const image = process.env.GAME_IMAGE || ''
  const url = process.env.GAME_URL || ''

  if (!pk || !gameSigner) throw new Error('Missing GAME_SIGNER_PK or GAME_SIGNER')

  const account = privateKeyToAccount(pk)
  const client = createWalletClient({ account, chain: chainFromEnv(), transport: http(process.env.MONAD_RPC) })

  const tx = await client.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'registerGame',
    args: [gameSigner, name, image, url]
  })
  console.log('registerGame tx:', tx)
}
main().catch(e => { console.error(e); process.exit(1) })
