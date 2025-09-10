// scripts/refresh-cache-with-usernames.ts
import { clearCache, refreshCache, getCacheInfo } from '../lib/leaderboard-cache'

async function main() {
  try {
    console.log('🚀 Refreshing cache with username lookup...')
    
    // Check current cache status
    const currentCache = getCacheInfo()
    console.log('Current cache status:', currentCache)
    
    // Clear old cache first
    console.log('🗑️ Clearing old cache...')
    clearCache()
    
    // Force refresh cache with username lookup
    console.log('🔄 Creating new cache with username lookup...')
    console.log('⏳ This may take a few minutes due to username lookups...')
    
    const freshData = await refreshCache()
    
    console.log('\n✅ Cache refreshed successfully with usernames!')
    console.log(`📊 Total entries: ${freshData.total}`)
    console.log(`📅 Last updated: ${freshData.lastUpdated}`)
    console.log(`🔍 Source: ${freshData.source}`)
    
    if (freshData.data.length > 0) {
      console.log('\n🏆 Top 10 players with usernames:')
      freshData.data.slice(0, 10).forEach((entry, index) => {
        const hasUsername = !entry.player.includes('0x0000')
        const displayName = hasUsername ? `@${entry.player}` : entry.player
        console.log(`${index + 1}. ${displayName} - Score: ${entry.score} - Games: ${entry.games}`)
      })
      
      // Count usernames found
      const usernameCount = freshData.data.filter(entry => !entry.player.includes('0x0000')).length
      console.log(`\n📈 Username lookup results:`)
      console.log(`   ✅ Found usernames: ${usernameCount}/${freshData.total}`)
      console.log(`   ❌ No username: ${freshData.total - usernameCount}/${freshData.total}`)
    }
    
    console.log('\n💡 Cache with usernames is ready for fast leaderboard loading!')
    
  } catch (error) {
    console.error('❌ Error refreshing cache:', error)
  }
}

// Chạy script
if (require.main === module) {
  main()
}
