# PRD - PoldaJabarCatpers Performance Optimization

## Problem Statement
Aplikasi dashboard Polda Jabar Catpers mengalami masalah loading yang sangat lambat atau stuck saat user membuka halaman awal setelah deploy di Vercel. Halaman sering menampilkan animasi loading atau blank dengan indikator loading browser terhenti.

## Root Cause Analysis
1. **Supabase Cold Start**: `getSession()` bisa timeout pada serverless cold start
2. **Blocking Auth Flow**: AuthContext memblokir render hingga session terverifikasi
3. **Async API Interceptor**: Request interceptor menunggu async Supabase check
4. **No Timeout/Fallback**: Tidak ada fallback jika Supabase lambat merespon

## Architecture

### Tech Stack
- **Frontend**: React 19 + Vite 7 (SPA)
- **Backend**: Node.js/Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel (Frontend), Vercel/Railway (Backend)

### Loading Strategy: Progressive Hybrid Loading
```
HTML Inline Loader → React Mount (cached) → Background Verify → Data Fetch
```

## What's Been Implemented

### Phase 3 - Anti-Stuck Loading (March 2026)
- [x] Timeout wrapper untuk Supabase calls (3s max)
- [x] Race pattern: UI render first, verify later
- [x] Cached user dari cookies untuk instant render
- [x] Sync API interceptor (no async blocking)
- [x] Retry logic untuk cold start (504, network errors)
- [x] HTML inline loading screen untuk instant First Paint
- [x] Safety timeout 5s untuk InitialLoader
- [x] Optimized Vite config (better chunking, esbuild)
- [x] DashboardContext priority loading (stats → satker → users)

### Previous Optimizations (Phase 1-2)
- [x] Lazy loading untuk secondary pages
- [x] Eager loading untuk Login + Dashboard
- [x] Prefetch routes setelah login
- [x] Code splitting dengan manualChunks
- [x] React.memo untuk components
- [x] Debounced search
- [x] 5 minute auto-refresh (reduced from 60s)

## User Personas
1. **Admin Polda**: Akses penuh ke semua fitur
2. **Operator Satker**: Akses terbatas ke unit sendiri

## Core Requirements (Static)
- Dashboard harus load dalam < 2 detik
- Tidak boleh ada blank/stuck state
- Harus handle cold start dengan graceful
- Cached credentials untuk instant access
- Fallback untuk setiap failure point

## Prioritized Backlog

### P0 (Critical) - Done
- [x] Fix loading stuck issue
- [x] Add timeout fallbacks
- [x] Implement progressive loading

### P1 (Important) - Backlog
- [ ] Add Service Worker untuk offline support
- [ ] Implement React Query untuk better caching
- [ ] Add error boundaries per section
- [ ] Performance monitoring (Web Vitals)

### P2 (Nice to Have) - Future
- [ ] PWA manifest
- [ ] Push notifications
- [ ] Image optimization
- [ ] Virtual scrolling untuk large lists

## Testing Notes
- Test dengan Network throttling (Slow 3G)
- Test cold start setelah 10 menit idle
- Test dengan Supabase offline (mock client)
- Verify Lighthouse score > 80

## Files Modified
- `/frontend/src/context/AuthContext.jsx` - Timeout + race pattern
- `/frontend/src/utils/supabase.js` - withTimeout helper, optimized config
- `/frontend/src/utils/api.js` - Sync interceptor, retry logic
- `/frontend/src/App.jsx` - InitialLoader with timeout
- `/frontend/src/context/DashboardContext.jsx` - Priority loading
- `/frontend/index.html` - Inline CSS, HTML loader
- `/frontend/vite.config.js` - Better chunking, esbuild

---
Last Updated: March 2026
