// scripts/parse-csv-logs.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseAllTransactionLogs, createLeaderboardFromLogs } from '../lib/parse-tx-logs'

async function main() {
  try {
    console.log('🚀 Starting CSV logs parsing...')
    
    // Đọc CSV file
    const csvPath = join(process.cwd(), 'tx.csv')
    const csvData = readFileSync(csvPath, 'utf-8')
    
    console.log('📄 CSV file loaded, parsing transactions...')
    
    // Parse tất cả transaction logs
    const logs = await parseAllTransactionLogs(csvData)
    
    console.log('\n📊 Parsed logs summary:')
    console.log(`Total transactions parsed: ${logs.length}`)
    
    if (logs.length > 0) {
      // Tạo leaderboard
      const leaderboard = createLeaderboardFromLogs(logs)
      
      console.log('\n🏆 Leaderboard:')
      console.table(leaderboard.slice(0, 10)) // Top 10
      
      // Thống kê chi tiết
      const totalScore = logs.reduce((sum, log) => sum + log.score, 0)
      const totalGames = logs.reduce((sum, log) => sum + log.transactionCount, 0)
      const avgScore = totalScore / logs.length
      
      console.log('\n📈 Statistics:')
      console.log(`Total score: ${totalScore.toLocaleString()}`)
      console.log(`Total games: ${totalGames}`)
      console.log(`Average score: ${avgScore.toFixed(2)}`)
      console.log(`Unique players: ${leaderboard.length}`)
      
      // Chi tiết từng transaction
      console.log('\n🔍 Transaction details:')
      logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.hash.slice(0, 10)}... - Player: ${log.playerAddress.slice(0, 8)}... - Score: ${log.score} - Games: ${log.transactionCount}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Chạy script
if (require.main === module) {
  main()
}
