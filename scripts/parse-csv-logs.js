// scripts/parse-csv-logs.js
const { readFileSync } = require('fs')
const { join } = require('path')

// Simple function to parse CSV and show basic info
function parseCSV() {
  try {
    console.log('🚀 Starting CSV parsing...')
    
    // Đọc CSV file
    const csvPath = join(process.cwd(), 'tx.csv')
    const csvData = readFileSync(csvPath, 'utf-8')
    
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',')
    
    console.log('📄 CSV file loaded:')
    console.log(`Total lines: ${lines.length}`)
    console.log(`Headers: ${headers.join(', ')}`)
    
    // Parse transactions
    const transactions = []
    const gameContract = '0xcecbff203c8b6044f52ce23d914a1bfd997541a4'
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = line.split(',')
      
      if (values.length >= headers.length) {
        const tx = {
          blockNumber: values[0],
          timestamp: values[1],
          hash: values[2],
          from: values[5],
          to: values[6],
          methodId: values[12]
        }
        
        // Chỉ lấy transactions gọi đến game contract
        if (tx.to.toLowerCase() === gameContract.toLowerCase()) {
          transactions.push(tx)
        }
      }
    }
    
    console.log(`\n🎮 Game transactions found: ${transactions.length}`)
    
    // Group by method
    const methodGroups = {}
    transactions.forEach(tx => {
      const method = tx.methodId || 'unknown'
      if (!methodGroups[method]) {
        methodGroups[method] = []
      }
      methodGroups[method].push(tx)
    })
    
    console.log('\n📊 Transactions by method:')
    Object.entries(methodGroups).forEach(([method, txs]) => {
      console.log(`  ${method}: ${txs.length} transactions`)
    })
    
    // Show sample transactions
    console.log('\n🔍 Sample transactions:')
    transactions.slice(0, 5).forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.hash.slice(0, 10)}... - From: ${tx.from.slice(0, 8)}... - Method: ${tx.methodId}`)
    })
    
    // Time analysis
    const timestamps = transactions.map(tx => parseInt(tx.timestamp))
    const minTime = new Date(Math.min(...timestamps) * 1000)
    const maxTime = new Date(Math.max(...timestamps) * 1000)
    
    console.log('\n⏰ Time range:')
    console.log(`  From: ${minTime.toLocaleString()}`)
    console.log(`  To: ${maxTime.toLocaleString()}`)
    console.log(`  Duration: ${Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24))} days`)
    
    console.log('\n✅ CSV parsing completed!')
    console.log('\n💡 Next steps:')
    console.log('  1. Install ts-node: npm install ts-node --save-dev')
    console.log('  2. Run: npm run parse:logs')
    console.log('  3. Or use blockchain RPC to get event logs')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Chạy function
parseCSV()
