// lib/monad.ts
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const CONTRACT = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4' as `0x${string}`

export const abi = parseAbi([
  'function updatePlayerData(address player, uint256 scoreAmount, uint256 transactionAmount)',
  'function registerGame(address _game, string _name, string _image, string _url)',
  'function getPlayerData(address player) view returns (uint256 score, uint256 transactions)',
  'function getLeaderboard(uint256 limit) view returns (address[] players, uint256[] scores, uint256[] transactions)',
  'function getTopPlayers(uint256 limit) view returns (address[] players, uint256[] scores)'
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
 * Tạo public client để read data từ contract
 */
function getPublicClient() {
  return createPublicClient({
    chain: chainFromEnv(),
    transport: http(process.env.MONAD_RPC)
  })
}

/**
 * Lấy leaderboard từ Monad Explorer API (thay vì RPC)
 */
export async function getGameLeaderboardFromMonadAPI(gameId: number = 231, limit: number = 50, sortBy: 'scores' | 'transactions' = 'scores') {
  try {
    console.log(`🔍 Fetching leaderboard from Monad Games API (sortBy: ${sortBy})...`)
    
    const response = await fetch(`https://monad-games-id-site.vercel.app/api/leaderboard?page=1&limit=${limit}&gameId=${gameId}&sortBy=${sortBy}&sortOrder=desc`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`✅ Monad API returned ${data.data.length} players (sorted by ${sortBy})`)
    
    // Convert Monad API format to our format
    const leaderboardData = data.data.map((entry: any) => ({
      rank: entry.rank,
      player: entry.username || `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`,
      wallet: entry.walletAddress,
      score: entry.score || entry.highScore || 0, // Use actual game score
      transactions: entry.transactionCount || 0
    }))
    
    console.log(`✅ Processed ${leaderboardData.length} players from Monad API`)
    return leaderboardData
    
  } catch (error) {
    console.error('Error reading Monad API leaderboard:', error)
    return []
  }
}

// Convenience functions for specific sorting
export async function getGameLeaderboardByScores(gameId: number = 231, limit: number = 50) {
  return getGameLeaderboardFromMonadAPI(gameId, limit, 'scores')
}

export async function getGameLeaderboardByTransactions(gameId: number = 231, limit: number = 50) {
  return getGameLeaderboardFromMonadAPI(gameId, limit, 'transactions')
}

/**
 * Lấy leaderboard từ transactions và logs của game address (RPC approach)
 */
export async function getGameLeaderboardFromTransactions(gameAddress: string, limit: number = 50) {
  try {
    console.log('Fetching leaderboard from game transactions...')
    
    const publicClient = getPublicClient()
    
    // 1. Lấy tất cả transactions từ game address
    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock = latestBlock - 1000n // Query từ 1k blocks gần đây (giảm range)
    
    console.log('Querying transactions from block:', fromBlock.toString(), 'to', latestBlock.toString())
    
    // Query transactions từ game address
    const transactions = await publicClient.getLogs({
      address: gameAddress as `0x${string}`,
      fromBlock,
      toBlock: latestBlock
    })
    
    console.log('Total transactions from game address:', transactions.length)
    
    // 2. Filter transactions có method updatePlayerData
    const updatePlayerDataTxs = []
    
    for (const txLog of transactions) {
      try {
        // Lấy transaction details
        const tx = await publicClient.getTransaction({
          hash: txLog.transactionHash
        })
        
        // Check nếu transaction gọi contract với method updatePlayerData
        if (tx.to?.toLowerCase() === CONTRACT.toLowerCase()) {
          // Decode input data để check method
          const inputData = tx.input
          if (inputData.startsWith('0x')) {
            // Method signature hash của updatePlayerData(address,uint256,uint256)
            // Keccak256 hash của "updatePlayerData(address,uint256,uint256)" = 0x7abd9d79...
            const updatePlayerDataMethodHash = '0x7abd9d79'
            
            if (inputData.startsWith(updatePlayerDataMethodHash)) {
              updatePlayerDataTxs.push({
                hash: txLog.transactionHash,
                from: tx.from,
                to: tx.to,
                input: inputData
              })
            }
          }
        }
      } catch (e) {
        console.log('Error getting transaction:', e)
      }
    }
    
    console.log('UpdatePlayerData transactions found:', updatePlayerDataTxs.length)
    
    // 3. Query logs của từng transaction để lấy event data
    const playerData = new Map<string, { maxScore: number, totalGames: number, latestScore: number }>()
    
    for (const tx of updatePlayerDataTxs) {
      try {
        // Lấy logs của transaction
        const receipt = await publicClient.getTransactionReceipt({
          hash: tx.hash
        })
        
        // Tìm PlayerDataUpdated event trong logs
        const playerDataLog = receipt.logs.find(log => 
          log.address.toLowerCase() === CONTRACT.toLowerCase() &&
          log.topics[0] === '0x7abd9d7967b45f7d1688e628d9f0149582c393b39aee236839ee1543e59af8ef'
        )
        
        if (playerDataLog && playerDataLog.topics.length >= 4) {
          // Remove padding zeros từ address
          let player = playerDataLog.topics[2] as string
          if (player.startsWith('0x000000000000000000000000')) {
            player = '0x' + player.slice(26) // Remove 24 zeros + '0x'
          }
          const scoreAmount = Number(playerDataLog.topics[3])
          
          // Parse transactionAmount từ data
          let transactionAmount = 1
          if (playerDataLog.data && playerDataLog.data !== '0x') {
            const dataHex = playerDataLog.data.slice(2)
            if (dataHex.length >= 64) {
              transactionAmount = parseInt(dataHex.slice(0, 64), 16)
            }
          }
          
          console.log('Parsed transaction:', { player, scoreAmount, transactionAmount })
          
          if (playerData.has(player)) {
            const existing = playerData.get(player)!
            playerData.set(player, {
              maxScore: Math.max(existing.maxScore, scoreAmount),
              totalGames: existing.totalGames + transactionAmount,
              latestScore: scoreAmount
            })
          } else {
            playerData.set(player, {
              maxScore: scoreAmount,
              totalGames: transactionAmount,
              latestScore: scoreAmount
            })
          }
        }
      } catch (e) {
        console.log('Error processing transaction:', tx.hash, e)
      }
    }
    
    // Convert to leaderboard format
    const leaderboardData = Array.from(playerData.entries())
      .map(([player, data], index) => ({
        rank: index + 1,
        player: `${player.slice(0, 6)}...${player.slice(-4)}`,
        wallet: player,
        score: data.latestScore,
        transactions: data.totalGames
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    
    // Update ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1
    })
    
    console.log('Mapped transaction leaderboard:', leaderboardData.length, 'entries')
    
    return leaderboardData
  } catch (e: any) {
    console.error('Error reading transaction leaderboard:', e)
    return []
  }
}

/**
 * Lookup username từ Monad Games ID
 */
async function lookupUsername(wallet: string): Promise<string | null> {
  try {
    console.log('Looking up username for wallet:', wallet)
    
    // Sử dụng external API endpoint (server-side)
    const response = await fetch(`https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${wallet}`, {
      cache: 'no-store'
    })
    
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.hasUsername && data.user?.username) {
        const username = data.user.username
        console.log('Found username:', username)
        return username
      }
    }
    
    console.log('No username found for wallet:', wallet)
    return null
  } catch (error) {
    console.log('Error looking up username:', error)
    return null
  }
}

/**
 * Lấy leaderboard từ CSV data (từ khi tạo game đến nay)
 */
export async function getGameLeaderboardFromCSV(gameAddress: string, limit: number = 50) {
  try {
    console.log('Fetching leaderboard from CSV data for game:', gameAddress)
    
    // Import functions từ parse-tx-logs
    const { parseAllTransactionLogs, createLeaderboardFromLogs } = await import('./parse-tx-logs')
    
    // Đọc CSV file
    const fs = await import('fs')
    const path = await import('path')
    const csvPath = path.join(process.cwd(), 'tx.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found, falling back to blockchain data')
      return await getGameLeaderboardFromBlockchain(gameAddress, limit)
    }
    
    const csvData = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse tất cả transaction logs từ CSV
    const logs = await parseAllTransactionLogs(csvData)
    
    // Filter theo game address (ví của bạn)
    const gameLogs = logs.filter(log => 
      log.gameAddress.toLowerCase() === gameAddress.toLowerCase()
    )
    
    console.log(`Found ${gameLogs.length} transactions for game ${gameAddress}`)
    
    if (gameLogs.length === 0) {
      console.log('No transactions found for this game, falling back to blockchain data')
      return await getGameLeaderboardFromBlockchain(gameAddress, limit)
    }
    
    // Tạo leaderboard từ logs
    const leaderboard = createLeaderboardFromLogs(gameLogs)
    
    // Lookup usernames từ Monad Games ID
    console.log('Looking up usernames from Monad Games ID...')
    const leaderboardWithUsernames = []
    
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i]
      try {
        console.log(`Looking up username ${i + 1}/${leaderboard.length} for wallet:`, entry.wallet)
        const username = await lookupUsername(entry.wallet)
        
        if (username) {
          console.log(`✅ Found username: ${username} for wallet: ${entry.wallet}`)
        } else {
          console.log(`❌ No username found for wallet: ${entry.wallet}`)
        }
        
        leaderboardWithUsernames.push({
          ...entry,
          player: username || entry.player // Sử dụng username nếu có, không thì dùng wallet short
        })
        
        // Thêm delay nhỏ để tránh rate limiting
        if (i < leaderboard.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        }
        
      } catch (error) {
        console.log('Error looking up username for', entry.wallet, error)
        leaderboardWithUsernames.push(entry)
      }
    }
    
    console.log('Mapped CSV leaderboard with usernames:', leaderboardWithUsernames.length, 'entries')
    
    return leaderboardWithUsernames.slice(0, limit)
    
  } catch (e: any) {
    console.error('Error reading CSV leaderboard:', e)
    // Fallback to blockchain data
    return await getGameLeaderboardFromBlockchain(gameAddress, limit)
  }
}

/**
 * Lấy leaderboard từ PlayerDataUpdated events của game cụ thể (fallback)
 */
export async function getGameLeaderboardFromBlockchain(gameAddress: string, limit: number = 50) {
  try {
    console.log('Fetching leaderboard from game events for:', gameAddress)
    console.log('Contract address:', CONTRACT)
    console.log('RPC URL:', process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz (default)')
    
    const publicClient = getPublicClient()
    console.log('Public client created successfully')
    
    // Lấy events PlayerDataUpdated từ game address cụ thể
    console.log('Querying events from recent blocks...')
    
    // Query theo từng giai đoạn để lấy tất cả dữ liệu
    const latestBlock = await publicClient.getBlockNumber()
    console.log('Latest block:', latestBlock.toString())
    
    // Query theo chunks để tránh "block range too large"
    const chunkSize = 1000n // 5k blocks per chunk (test với 5k trước)
    const maxChunks = 100 // Tối đa 10 chunks = 50k blocks
    let allEvents: any[] = []
    
    for (let i = 0; i < maxChunks; i++) {
      const toBlock = latestBlock - (BigInt(i) * chunkSize)
      const fromBlock = toBlock - chunkSize + 1n
      
      if (fromBlock < 0n) break
      
      console.log(`Querying chunk ${i + 1}: block ${fromBlock.toString()} to ${toBlock.toString()}`)
      
      try {
        const chunkEvents = await publicClient.getLogs({
          address: CONTRACT,
          event: {
            type: 'event',
            name: 'PlayerDataUpdated',
            inputs: [
              { name: 'game', type: 'address', indexed: true },
              { name: 'player', type: 'address', indexed: true },
              { name: 'scoreAmount', type: 'uint256', indexed: true },
              { name: 'transactionAmount', type: 'uint256', indexed: false }
            ]
          },
          args: {
            game: gameAddress as `0x${string}`
          },
          fromBlock,
          toBlock
        })
        
        console.log(`Chunk ${i + 1} found ${chunkEvents.length} events`)
        allEvents = allEvents.concat(chunkEvents)
        
        // Nếu chunk này không có events, có thể đã hết dữ liệu
        if (chunkEvents.length === 0) {
          console.log('No more events found, stopping search')
          break
        }
        
        // Nếu chunk này có ít events, có thể đã gần hết dữ liệu
        if (chunkEvents.length < 10) {
          console.log('Few events found, might be near the end')
        }
        
      } catch (e: any) {
        console.log(`Error in chunk ${i + 1}:`, e.message)
        // Nếu có lỗi, dừng lại
        break
      }
    }
    
    console.log(`Total events found across all chunks: ${allEvents.length}`)
    const events = allEvents
    
    console.log('Found events:', events.length)
    
    // Aggregate data by player (lấy điểm cao nhất và tổng số games)
    const playerData = new Map<string, { maxScore: number, totalGames: number, latestScore: number }>()
    
    events.forEach(event => {
      // Parse event data từ decoded args
      if (event.args) {
        const { game, player, scoreAmount, transactionAmount } = event.args
        
        // Remove padding zeros từ address nếu cần
        let cleanPlayer = player
        if (typeof cleanPlayer === 'string' && cleanPlayer.startsWith('0x000000000000000000000000')) {
          cleanPlayer = '0x' + cleanPlayer.slice(26) // Remove 24 zeros + '0x'
          console.log('Address transformation:', player, '->', cleanPlayer)
        }
        
        const score = Number(scoreAmount)
        const games = Number(transactionAmount || 1)
        
        console.log('Parsed event:', { player: cleanPlayer, score, games })
        
        if (playerData.has(cleanPlayer)) {
          const existing = playerData.get(cleanPlayer)!
          playerData.set(cleanPlayer, {
            maxScore: Math.max(existing.maxScore, score),
            totalGames: existing.totalGames + games,
            latestScore: score // Lấy score mới nhất
          })
        } else {
          playerData.set(cleanPlayer, {
            maxScore: score,
            totalGames: games,
            latestScore: score
          })
        }
      }
    })
    
    // Convert to leaderboard format và sort theo score
    const leaderboardData = Array.from(playerData.entries())
      .map(([player, data], index) => ({
        rank: index + 1,
        player: `${player.slice(0, 6)}...${player.slice(-4)}`, // Short format
        wallet: player,
        score: data.latestScore, // Sử dụng score mới nhất
        transactions: data.totalGames
      }))
      .sort((a, b) => b.score - a.score) // Sort theo score giảm dần
      .slice(0, limit) // Limit kết quả

    // Lookup usernames từ Monad Games ID (với rate limiting)
    console.log('Looking up usernames from Monad Games ID...')
    console.log('Total entries to lookup:', leaderboardData.length)
    
    const leaderboardWithUsernames = []
    
    // Process từng entry một cách tuần tự để tránh rate limiting
    for (let i = 0; i < leaderboardData.length; i++) {
      const entry = leaderboardData[i]
      try {
        console.log(`Looking up username ${i + 1}/${leaderboardData.length} for wallet:`, entry.wallet)
        const username = await lookupUsername(entry.wallet)
        
        if (username) {
          console.log(`✅ Found username: ${username} for wallet: ${entry.wallet}`)
        } else {
          console.log(`❌ No username found for wallet: ${entry.wallet}`)
        }
        
        leaderboardWithUsernames.push({
          ...entry,
          player: username || entry.player // Sử dụng username nếu có, không thì dùng wallet short
        })
        
        // Thêm delay nhỏ để tránh rate limiting
        if (i < leaderboardData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        }
        
      } catch (error) {
        console.log('Error looking up username for', entry.wallet, error)
        leaderboardWithUsernames.push(entry)
      }
    }
    
    // Update ranks
    leaderboardWithUsernames.forEach((entry, index) => {
      entry.rank = index + 1
    })
    
    console.log('Mapped game leaderboard with usernames:', leaderboardWithUsernames.length, 'entries')
    
    return leaderboardWithUsernames
  } catch (e: any) {
    console.error('Error reading game leaderboard:', e)
    return []
  }
}

/**
 * Lấy leaderboard trực tiếp từ smart contract (fallback)
 */
export async function getContractLeaderboard(limit: number = 50) {
  try {
    console.log('Fetching leaderboard from smart contract...')
    
    const publicClient = getPublicClient()
    
    // Gọi function getLeaderboard từ contract
    const result = await publicClient.readContract({
      address: CONTRACT,
      abi,
      functionName: 'getLeaderboard',
      args: [BigInt(limit)]
    })
    
    const [players, scores, transactions] = result
    
    console.log('Contract leaderboard result:', {
      playersCount: players.length,
      scoresCount: scores.length,
      transactionsCount: transactions.length
    })
    
    // Map data to leaderboard format
    const leaderboardData = players.map((player, index) => ({
      rank: index + 1,
      player: `${player.slice(0, 6)}...${player.slice(-4)}`, // Short format
      wallet: player,
      score: Number(scores[index] || 0),
      transactions: Number(transactions[index] || 0)
    }))
    
    console.log('Mapped contract leaderboard:', leaderboardData.length, 'entries')
    
    return leaderboardData
  } catch (e: any) {
    console.error('Error reading contract leaderboard:', e)
    return []
  }
}

/**
 * Query leaderboard từ CSV data (ưu tiên) hoặc blockchain (fallback)
 */
export async function readLeaderboard(limit: number = 50, gameFilter?: string) {
  // Nếu có gameFilter, ưu tiên sử dụng CSV data
  if (gameFilter) {
    try {
      console.log('Using CSV data for game-specific leaderboard:', gameFilter)
      return await getGameLeaderboardFromCSV(gameFilter, limit)
    } catch (e) {
      console.log('CSV data failed, falling back to blockchain data')
    }
  }
  
  // Fallback to ecosystem data
  return await readEcosystemLeaderboard(limit, gameFilter)
}

/**
 * Query leaderboard từ Monad Games ecosystem (fallback)
 * Note: Hiện tại lấy tất cả games vì không thể filter theo game cụ thể từ server-side
 */
export async function readEcosystemLeaderboard(limit: number = 50, gameFilter?: string) {
  try {
    console.log('Fetching leaderboard from Monad Games ecosystem...', gameFilter ? `(requested filter: ${gameFilter})` : 'all games')
    
    // Query từ Monad Games ecosystem
    const response = await fetch('https://monad-games-id-site.vercel.app/leaderboard', {
      cache: 'no-store'
    })
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    console.log('HTML length:', html.length)
    
    const parsedData = parseLeaderboardFromHTML(html, limit)
    console.log('Parsed data:', parsedData.length, 'entries')
    
    // Note: Hiện tại trả về tất cả games vì không thể filter theo game cụ thể
    // Trong tương lai có thể implement local database để lưu dữ liệu theo game
    if (gameFilter) {
      console.log(`Note: Cannot filter by game "${gameFilter}" from ecosystem HTML. Returning all games data.`)
    }
    
    return parsedData
  } catch (e: any) {
    console.error('Error reading ecosystem leaderboard:', e)
    return []
  }
}

/**
 * Parse leaderboard data từ HTML của Monad Games ecosystem
 */
function parseLeaderboardFromHTML(html: string, limit: number = 50) {
  try {
    // Import cheerio dynamically để tránh lỗi server-side
    const cheerio = require('cheerio')
    const $ = cheerio.load(html)
    
    console.log('Parsing HTML with cheerio...')
    
    const leaderboardData: Array<{
      rank: number
      player: string
      score: number
      transactions: number
    }> = []
    
    // Tìm các hàng trong bảng leaderboard
    const walletLinks = $('a[href*="testnet.monadexplorer.com"]')
    console.log('Found', walletLinks.length, 'wallet links')
    
    walletLinks.each((index: number, element: any) => {
      if (index >= limit) return false // Stop after limit
      
      const $link = $(element)
      const walletShort = $link.text().trim()
      
      if (walletShort && walletShort.includes('0x') && walletShort.includes('…')) {
        // Tìm row chứa link này
        const $row = $link.closest('tr')
        if ($row.length > 0) {
          const cells = $row.find('td, th').toArray().map((td: any) => $(td).text().trim()).filter(Boolean)
          
          // Tìm rank (thường là cell đầu tiên)
          let rank = index + 1
          const rankText = cells[0] || ''
          const rankMatch = rankText.match(/(\d+)/)
          if (rankMatch) {
            rank = parseInt(rankMatch[1])
          }
          
          // Tìm transactions/score (thường là số cuối cùng trong row)
          let transactions = 0
          let score = 0
          
          for (let i = cells.length - 1; i >= 0; i--) {
            const cellValue = cells[i].replace(/,/g, '')
            const numValue = parseInt(cellValue)
            if (!isNaN(numValue) && numValue > 0) {
              transactions = numValue
              score = Math.floor(numValue * 0.1) // Approximate score
              break
            }
          }
          
          leaderboardData.push({
            rank,
            player: walletShort,
            score,
            transactions
          })
        }
      }
    })
    
    // Sort by rank để đảm bảo thứ tự đúng
    leaderboardData.sort((a, b) => a.rank - b.rank)
    
    console.log('Final parsed data:', leaderboardData.length, 'entries')
    if (leaderboardData.length > 0) {
      console.log('Sample entry:', leaderboardData[0])
    }
    
    return leaderboardData.slice(0, limit)
  } catch (e) {
    console.error('Error parsing leaderboard HTML:', e)
    return []
  }
}

/**
 * Query player data từ smart contract
 */
export async function readPlayerData(player: `0x${string}`) {
  try {
    const client = getPublicClient()
    
    const result = await client.readContract({
      address: CONTRACT,
      abi,
      functionName: 'getPlayerData',
      args: [player]
    })
    
    const [score, transactions] = result as [bigint, bigint]
    
    return {
      score: Number(score),
      transactions: Number(transactions)
    }
  } catch (e: any) {
    console.error('Error reading player data:', e)
    return { score: 0, transactions: 0 }
  }
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
