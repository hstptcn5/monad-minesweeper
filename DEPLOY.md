# 🚀 Deploy Monad Minesweeper lên Vercel

## **📋 Checklist trước khi deploy:**

### **1. Environment Variables:**
Tạo file `.env.local` hoặc cấu hình trong Vercel Dashboard:

```bash
# Monad Games ID Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Monad Blockchain Configuration
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143

# Game Contract Address
GAME_CONTRACT_ADDRESS=0xceCBFF203C8B6044F52CE23D914A1bfD997541A4

# Username Lookup API
USERNAME_LOOKUP_API_URL=https://monad-games-id-site.vercel.app/api/lookup-username

# Cache Configuration
CACHE_DURATION=86400000
```

### **2. Files cần thiết:**
- ✅ `tx.csv` - Dữ liệu lịch sử transactions
- ✅ `leaderboard-cache.json` - Cache file (sẽ được tạo tự động)
- ✅ `vercel.json` - Cấu hình Vercel

### **3. Build Commands:**
```bash
npm run build
npm run start
```

## **🔧 Cấu hình Vercel:**

### **1. Project Settings:**
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### **2. Environment Variables:**
Thêm các biến môi trường trong Vercel Dashboard:
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `MONAD_RPC_URL`
- `MONAD_CHAIN_ID`
- `GAME_CONTRACT_ADDRESS`
- `USERNAME_LOOKUP_API_URL`
- `CACHE_DURATION`

### **3. Function Configuration:**
- **Max Duration:** 30 seconds
- **Memory:** 1024 MB
- **Region:** Auto

## **📁 File Structure:**
```
monad-minesweeper/
├── app/                    # Next.js App Router
├── components/             # React Components
├── lib/                    # Utility Libraries
├── scripts/                # Build Scripts
├── public/                 # Static Assets
├── tx.csv                  # Transaction History
├── leaderboard-cache.json  # Cache File
├── vercel.json            # Vercel Config
└── package.json           # Dependencies
```

## **🚀 Deploy Steps:**

### **1. Push to GitHub:**
```bash
git add .
git commit -m "Ready for Vercel deploy"
git push origin main
```

### **2. Connect to Vercel:**
1. Go to [vercel.com](https://vercel.com)
2. Import project from GitHub
3. Configure environment variables
4. Deploy

### **3. Post-Deploy:**
```bash
# Tạo cache ban đầu (optional)
npm run create:cache

# Fix address padding (nếu cần)
npm run fix:addresses

# Refresh với usernames
npm run refresh:usernames
```

## **🔍 Monitoring:**

### **1. Logs:**
- Vercel Dashboard → Functions → View Logs
- Check API routes: `/api/leaderboard/minesweeper`
- Check cache: `/api/check-new-data`

### **2. Performance:**
- Cache hit rate
- API response times
- Username lookup success rate

## **⚠️ Troubleshooting:**

### **1. Build Errors:**
- Check TypeScript errors: `npm run typecheck`
- Verify dependencies: `npm install`
- Check environment variables

### **2. Runtime Errors:**
- Check Vercel logs
- Verify RPC endpoints
- Check contract addresses

### **3. Cache Issues:**
- Clear cache: Delete `leaderboard-cache.json`
- Recreate cache: `npm run create:cache`
- Check CSV file format

## **🎯 Success Indicators:**

- ✅ Build successful
- ✅ Leaderboard loads
- ✅ Usernames display correctly
- ✅ Cache updates automatically
- ✅ New games trigger updates

## **📞 Support:**

Nếu gặp vấn đề:
1. Check Vercel logs
2. Verify environment variables
3. Test locally: `npm run dev`
4. Check blockchain connectivity

---

**🎉 Chúc bạn deploy thành công!**
