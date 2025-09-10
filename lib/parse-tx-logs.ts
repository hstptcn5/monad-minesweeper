// lib/parse-tx-logs.ts
import { createPublicClient, http, parseAbi } from 'viem'

// Contract ABI để decode events
export const abi = parseAbi([
  'event PlayerDataUpdated(address indexed game, address indexed player, uint256 indexed scoreAmount, uint256 transactionAmount)',
  'function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount)'
])

// Monad testnet config
const chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } }
} as const

function getPublicClient() {
  return createPublicClient({
    chain,
    transport: http('https://testnet-rpc.monad.xyz')
  })
}

export interface TransactionLog {
  blockNumber: number
  timestamp: number
  hash: string
  from: string
  to: string
  gameAddress: string
  playerAddress: string
  score: number
  transactionCount: number
  gasUsed: string
  gasPrice: string
}

/**
 * Lấy chi tiết logs từ một transaction hash
 */
export async function getTransactionLogs(txHash: string): Promise<TransactionLog | null> {
  try {
    const client = getPublicClient()
    
    // Lấy transaction receipt để có logs
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`
    })
    
    if (!receipt) {
      console.log('No receipt found for tx:', txHash)
      return null
    }
    
    // Lấy transaction details
    const tx = await client.getTransaction({
      hash: txHash as `0x${string}`
    })
    
    // Tìm PlayerDataUpdated event trong logs
    const playerDataLog = receipt.logs.find(log => 
      log.address.toLowerCase() === '0xcecbff203c8b6044f52ce23d914a1bfd997541a4' &&
      log.topics[0] === '0x7abd9d7967b45f7d1688e628d9f0149582c393b39aee236839ee1543e59af8ef'
    )
    
    if (!playerDataLog || playerDataLog.topics.length < 4) {
      console.log('No PlayerDataUpdated event found in tx:', txHash)
      return null
    }
    
    // Parse event data
    let gameAddress = playerDataLog.topics[1] as string
    let playerAddress = playerDataLog.topics[2] as string
    
    // Remove padding zeros từ addresses (Ethereum addresses are 20 bytes = 40 hex chars)
    if (gameAddress.startsWith('0x000000000000000000000000')) {
      gameAddress = '0x' + gameAddress.slice(26) // Remove 24 zeros + '0x'
    }
    if (playerAddress.startsWith('0x000000000000000000000000')) {
      playerAddress = '0x' + playerAddress.slice(26) // Remove 24 zeros + '0x'
    }
    
    const scoreAmount = Number(playerDataLog.topics[3])
    
    // Parse transactionAmount từ data (non-indexed parameter)
    let transactionAmount = 1
    if (playerDataLog.data && playerDataLog.data !== '0x') {
      const dataHex = playerDataLog.data.slice(2)
      if (dataHex.length >= 64) {
        transactionAmount = parseInt(dataHex.slice(0, 64), 16)
      }
    }
    
    // Lấy block để có timestamp
    const block = await client.getBlock({
      blockNumber: receipt.blockNumber
    })
    
    return {
      blockNumber: Number(receipt.blockNumber),
      timestamp: Number(block.timestamp),
      hash: txHash,
      from: tx.from,
      to: tx.to || '',
      gameAddress: gameAddress.toLowerCase(),
      playerAddress: playerAddress.toLowerCase(),
      score: scoreAmount,
      transactionCount: transactionAmount,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() || '0'
    }
    
  } catch (error) {
    console.error('Error getting transaction logs for', txHash, error)
    return null
  }
}

/**
 * Parse tất cả transactions từ CSV và lấy logs
 */
export async function parseAllTransactionLogs(csvData: string): Promise<TransactionLog[]> {
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',')
  const transactions: TransactionLog[] = []
  
  console.log('Parsing', lines.length - 1, 'transactions from CSV...')
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = line.split(',')
    
    if (values.length < headers.length) continue
    
    const hash = values[2] // hash column
    const to = values[6] // to column
    
    // Chỉ parse transactions gọi đến Monad Games contract
    if (to.toLowerCase() === '0xcecbff203c8b6044f52ce23d914a1bfd997541a4') {
      console.log(`Processing transaction ${i}/${lines.length - 1}: ${hash}`)
      
      const logData = await getTransactionLogs(hash)
      if (logData) {
        transactions.push(logData)
        console.log('✅ Parsed:', {
          player: logData.playerAddress,
          score: logData.score,
          games: logData.transactionCount
        })
      } else {
        console.log('❌ Failed to parse:', hash)
      }
      
      // Thêm delay để tránh rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log('Total parsed transactions:', transactions.length)
  return transactions
}

/**
 * Tạo leaderboard từ parsed logs
 */
export function createLeaderboardFromLogs(logs: TransactionLog[]) {
  const playerData = new Map<string, {
    maxScore: number
    totalGames: number
    latestScore: number
    latestTimestamp: number
  }>()
  
  logs.forEach(log => {
    // Clean up player address (remove padding zeros if any)
    let player = log.playerAddress
    if (player.startsWith('0x000000000000000000000000')) {
      player = '0x' + player.slice(26) // Remove 24 zeros + '0x'
    }
    
    if (playerData.has(player)) {
      const existing = playerData.get(player)!
      playerData.set(player, {
        maxScore: Math.max(existing.maxScore, log.score),
        totalGames: existing.totalGames + log.transactionCount,
        latestScore: log.score,
        latestTimestamp: Math.max(existing.latestTimestamp, log.timestamp)
      })
    } else {
      playerData.set(player, {
        maxScore: log.score,
        totalGames: log.transactionCount,
        latestScore: log.score,
        latestTimestamp: log.timestamp
      })
    }
  })
  
  // Convert to leaderboard format
  const leaderboard = Array.from(playerData.entries())
    .map(([player, data], index) => ({
      rank: index + 1,
      player: `${player.slice(0, 6)}...${player.slice(-4)}`,
      wallet: player,
      score: data.latestScore,
      maxScore: data.maxScore,
      games: data.totalGames,
      latestTimestamp: data.latestTimestamp
    }))
    .sort((a, b) => b.score - a.score)
  
  // Update ranks
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })
  
  return leaderboard
}
