// scripts/fix-address-padding.ts
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

function fixAddressPadding(address: string): string {
  if (address.startsWith('0x000000000000000000000000')) {
    return '0x' + address.slice(26) // Remove 24 zeros + '0x'
  }
  return address
}

async function main() {
  try {
    console.log('🔧 Fixing address padding in cache...')
    
    const cacheFile = join(process.cwd(), 'leaderboard-cache.json')
    
    if (!existsSync(cacheFile)) {
      console.log('❌ Cache file not found')
      return
    }
    
    // Read current cache
    const cacheData = readFileSync(cacheFile, 'utf-8')
    const cache = JSON.parse(cacheData)
    
    console.log(`📊 Current cache has ${cache.data.length} entries`)
    
    // Fix addresses in cache
    let fixedCount = 0
    cache.data.forEach((entry: any) => {
      const originalWallet = entry.wallet
      const fixedWallet = fixAddressPadding(originalWallet)
      
      if (originalWallet !== fixedWallet) {
        console.log(`🔧 Fixing: ${originalWallet} → ${fixedWallet}`)
        entry.wallet = fixedWallet
        entry.player = fixAddressPadding(entry.player)
        fixedCount++
      }
    })
    
    if (fixedCount > 0) {
      // Save fixed cache
      writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
      console.log(`✅ Fixed ${fixedCount} addresses in cache`)
    } else {
      console.log('✅ No addresses needed fixing')
    }
    
    // Show sample of fixed addresses
    console.log('\n📋 Sample of addresses in cache:')
    cache.data.slice(0, 5).forEach((entry: any, index: number) => {
      console.log(`${index + 1}. ${entry.wallet} - Score: ${entry.score}`)
    })
    
  } catch (error) {
    console.error('❌ Error fixing address padding:', error)
  }
}

// Chạy script
if (require.main === module) {
  main()
}
