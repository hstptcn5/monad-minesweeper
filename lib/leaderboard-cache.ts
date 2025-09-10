// lib/leaderboard-cache.ts
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { parseAllTransactionLogs, createLeaderboardFromLogs } from './parse-tx-logs'

export interface CachedLeaderboardData {
  data: Array<{
    rank: number
    player: string
    wallet: string
    score: number
    games: number
    maxScore: number
    latestTimestamp: number
  }>
  total: number
  lastUpdated: string
  csvHash: string
  source: 'csv-cache' | 'blockchain' | 'error'
}

const CACHE_FILE = join(process.cwd(), 'leaderboard-cache.json')
const CSV_FILE = join(process.cwd(), 'tx.csv')
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 giờ (cache lâu hơn vì CSV không đổi)

/**
 * Tạo hash từ CSV file để detect changes
 */
function getCSVHash(): string {
  if (!existsSync(CSV_FILE)) return ''
  
  const stats = statSync(CSV_FILE)
  return `${stats.mtime.getTime()}-${stats.size}`
}

/**
 * Kiểm tra cache có còn valid không
 */
function isCacheValid(cachedData: CachedLeaderboardData): boolean {
  const now = Date.now()
  const lastUpdated = new Date(cachedData.lastUpdated).getTime()
  const csvHash = getCSVHash()
  
  // Cache valid nếu:
  // 1. Chưa hết hạn (24h)
  // 2. CSV file không thay đổi (dữ liệu cứng)
  // 3. Không phải lỗi
  return (now - lastUpdated < CACHE_DURATION) && 
         (cachedData.csvHash === csvHash) && 
         (cachedData.source !== 'error')
}

/**
 * Load cache từ file
 */
function loadCache(): CachedLeaderboardData | null {
  try {
    if (!existsSync(CACHE_FILE)) return null
    
    const cacheData = readFileSync(CACHE_FILE, 'utf-8')
    const parsed = JSON.parse(cacheData) as CachedLeaderboardData
    
    if (isCacheValid(parsed)) {
      console.log('✅ Using valid cache data')
      return parsed
    } else {
      console.log('⚠️ Cache expired or CSV changed, will refresh')
      return null
    }
  } catch (error) {
    console.log('❌ Error loading cache:', error)
    return null
  }
}

/**
 * Save cache to file
 */
function saveCache(data: CachedLeaderboardData): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2))
    console.log('✅ Cache saved successfully')
  } catch (error) {
    console.log('❌ Error saving cache:', error)
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
 * Parse CSV và tạo leaderboard data với username lookup
 */
async function parseCSVData(): Promise<CachedLeaderboardData> {
  try {
    console.log('🔄 Parsing CSV data...')
    
    if (!existsSync(CSV_FILE)) {
      throw new Error('CSV file not found')
    }
    
    const csvData = readFileSync(CSV_FILE, 'utf-8')
    const logs = await parseAllTransactionLogs(csvData)
    const leaderboard = createLeaderboardFromLogs(logs)
    
    // Lookup usernames từ Monad Games ID
    console.log('🔍 Looking up usernames from Monad Games ID...')
    console.log('Total entries to lookup:', leaderboard.length)
    
    const leaderboardWithUsernames = []
    
    // Process từng entry một cách tuần tự để tránh rate limiting
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
          await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
        }
        
      } catch (error) {
        console.log('Error looking up username for', entry.wallet, error)
        leaderboardWithUsernames.push(entry)
      }
    }
    
    const result: CachedLeaderboardData = {
      data: leaderboardWithUsernames,
      total: leaderboardWithUsernames.length,
      lastUpdated: new Date().toISOString(),
      csvHash: getCSVHash(),
      source: 'csv-cache'
    }
    
    console.log(`✅ Parsed ${result.total} entries from CSV with usernames`)
    return result
    
  } catch (error) {
    console.error('❌ Error parsing CSV:', error)
    return {
      data: [],
      total: 0,
      lastUpdated: new Date().toISOString(),
      csvHash: '',
      source: 'error'
    }
  }
}

/**
 * Lấy leaderboard data (từ cache hoặc parse mới)
 */
export async function getCachedLeaderboard(): Promise<CachedLeaderboardData> {
  // Thử load cache trước
  const cached = loadCache()
  if (cached) {
    return cached
  }
  
  // Cache không valid, parse CSV mới
  console.log('🔄 Cache invalid, parsing CSV data...')
  const freshData = await parseCSVData()
  
  // Save cache mới
  saveCache(freshData)
  
  return freshData
}

/**
 * Force refresh cache (khi có dữ liệu mới)
 */
export async function refreshCache(): Promise<CachedLeaderboardData> {
  console.log('🔄 Force refreshing cache...')
  const freshData = await parseCSVData()
  saveCache(freshData)
  return freshData
}

/**
 * Merge dữ liệu mới với cache cũ
 */
export async function mergeNewData(newTransactions: any[]): Promise<CachedLeaderboardData> {
  try {
    console.log('🔄 Merging new data with cache...')
    
    // Load cache hiện tại
    const currentCache = loadCache()
    if (!currentCache) {
      console.log('⚠️ No cache found, creating new cache...')
      return await refreshCache()
    }
    
    // Parse new transactions
    const newLogs = newTransactions.map(tx => {
      // Clean up player address (remove padding zeros if any)
      let playerAddress = tx.playerAddress
      if (playerAddress.startsWith('0x000000000000000000000000')) {
        playerAddress = '0x' + playerAddress.slice(26) // Remove 24 zeros + '0x'
      }
      
      return {
        rank: 0, // Sẽ được tính lại
        player: playerAddress,
        wallet: playerAddress,
        score: tx.score,
        games: tx.transactionCount,
        maxScore: tx.score,
        latestTimestamp: tx.timestamp
      }
    })
    
    // Merge với cache cũ
    const mergedData = [...currentCache.data, ...newLogs]
    
    // Recalculate leaderboard
    const playerData = new Map<string, {
      maxScore: number
      totalGames: number
      latestScore: number
      latestTimestamp: number
    }>()
    
    mergedData.forEach(entry => {
      const player = entry.wallet
      
      if (playerData.has(player)) {
        const existing = playerData.get(player)!
        playerData.set(player, {
          maxScore: Math.max(existing.maxScore, entry.score),
          totalGames: existing.totalGames + entry.games,
          latestScore: entry.score,
          latestTimestamp: Math.max(existing.latestTimestamp, entry.latestTimestamp)
        })
      } else {
        playerData.set(player, {
          maxScore: entry.score,
          totalGames: entry.games,
          latestScore: entry.score,
          latestTimestamp: entry.latestTimestamp
        })
      }
    })
    
    // Convert to leaderboard format
    const leaderboard = Array.from(playerData.entries())
      .map(([player, data], index) => ({
        rank: index + 1,
        player: `${player.slice(0, 6)}...${player.slice(-4)}`, // Temporary, will be updated with username
        wallet: player,
        score: data.latestScore,
        games: data.totalGames,
        maxScore: data.maxScore,
        latestTimestamp: data.latestTimestamp
      }))
      .sort((a, b) => b.score - a.score)
    
    // Lookup usernames for new entries only
    console.log('🔍 Looking up usernames for new entries...')
    const leaderboardWithUsernames = []
    
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i]
      
      // Check if this is a new entry (not in original cache)
      const isNewEntry = newTransactions.some(tx => tx.playerAddress === entry.wallet)
      
      if (isNewEntry) {
        try {
          console.log(`Looking up username for new entry: ${entry.wallet}`)
          const username = await lookupUsername(entry.wallet)
          
          if (username) {
            console.log(`✅ Found username: ${username} for new entry: ${entry.wallet}`)
            leaderboardWithUsernames.push({
              ...entry,
              player: username
            })
          } else {
            leaderboardWithUsernames.push(entry)
          }
          
          // Delay for new entries only
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.log('Error looking up username for new entry:', entry.wallet, error)
          leaderboardWithUsernames.push(entry)
        }
      } else {
        // Keep existing username from cache
        leaderboardWithUsernames.push(entry)
      }
    }
    
    // Update ranks
    leaderboardWithUsernames.forEach((entry, index) => {
      entry.rank = index + 1
    })
    
    const result: CachedLeaderboardData = {
      data: leaderboardWithUsernames,
      total: leaderboardWithUsernames.length,
      lastUpdated: new Date().toISOString(),
      csvHash: currentCache.csvHash, // Giữ nguyên CSV hash
      source: 'csv-cache'
    }
    
    // Save updated cache
    saveCache(result)
    
    console.log(`✅ Merged ${newTransactions.length} new transactions`)
    console.log(`📊 Total entries: ${result.total}`)
    
    return result
    
  } catch (error) {
    console.error('❌ Error merging new data:', error)
    return await refreshCache()
  }
}

/**
 * Clear cache (khi cần reset)
 */
export function clearCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      require('fs').unlinkSync(CACHE_FILE)
      console.log('✅ Cache cleared')
    }
  } catch (error) {
    console.log('❌ Error clearing cache:', error)
  }
}

/**
 * Get cache info
 */
export function getCacheInfo(): {
  exists: boolean
  lastUpdated?: string
  total?: number
  source?: string
} {
  try {
    if (!existsSync(CACHE_FILE)) {
      return { exists: false }
    }
    
    const cacheData = readFileSync(CACHE_FILE, 'utf-8')
    const parsed = JSON.parse(cacheData) as CachedLeaderboardData
    
    return {
      exists: true,
      lastUpdated: parsed.lastUpdated,
      total: parsed.total,
      source: parsed.source
    }
  } catch (error) {
    return { exists: false }
  }
}
