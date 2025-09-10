// scripts/create-cache.ts
import { refreshCache, getCacheInfo } from '../lib/leaderboard-cache'

async function main() {
  try {
    console.log('🚀 Creating initial leaderboard cache...')
    
    // Check current cache status
    const currentCache = getCacheInfo()
    console.log('Current cache status:', currentCache)
    
    // Force refresh cache
    console.log('🔄 Creating/refreshing cache...')
    const freshData = await refreshCache()
    
    console.log('\n✅ Cache created successfully!')
    console.log(`📊 Total entries: ${freshData.total}`)
    console.log(`📅 Last updated: ${freshData.lastUpdated}`)
    console.log(`🔍 Source: ${freshData.source}`)
    
    if (freshData.data.length > 0) {
      console.log('\n🏆 Top 5 players:')
      freshData.data.slice(0, 5).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.player} - Score: ${entry.score} - Games: ${entry.games}`)
      })
    }
    
    console.log('\n💡 Cache will be used for fast leaderboard loading!')
    
  } catch (error) {
    console.error('❌ Error creating cache:', error)
  }
}

// Chạy script
if (require.main === module) {
  main()
}
