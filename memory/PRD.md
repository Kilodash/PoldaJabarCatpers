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
- **State Management**: React Query (TanStack Query) untuk server state
- **Backend**: Node.js/Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel (Frontend), Vercel/Railway (Backend)

### Loading Strategy: Progressive Hybrid Loading
```
HTML Inline Loader → React Mount (cached) → Background Verify → Data Fetch (React Query)
```

## What's Been Implemented

### Phase 4 - React Query Integration (March 2026)
- [x] @tanstack/react-query untuk server state management
- [x] Query client dengan optimized defaults (staleTime, gcTime, retry)
- [x] Custom hooks: useDashboardStats, useSatkerStats, usePersonelList, dll
- [x] Query keys factory untuk konsistensi caching
- [x] Mutations dengan auto-invalidation (useDeletePersonel, useRestorePersonel)
- [x] DashboardContext refactored menggunakan React Query hooks
- [x] Dashboard.jsx menggunakan usePersonelList untuk modal data

### Phase 3 - Anti-Stuck Loading (March 2026)
- [x] Timeout wrapper untuk Supabase calls (3s max)
- [x] Race pattern: UI render first, verify later
- [x] Cached user dari cookies untuk instant render
- [x] Sync API interceptor (no async blocking)
- [x] Retry logic untuk cold start (504, network errors)
- [x] HTML inline loading screen untuk instant First Paint
- [x] Safety timeout 5s untuk InitialLoader
- [x] Optimized Vite config (better chunking, esbuild)

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
- Smart caching dengan React Query

## Prioritized Backlog

### P0 (Critical) - Done
- [x] Fix loading stuck issue
- [x] Add timeout fallbacks
- [x] Implement progressive loading
- [x] React Query integration

### P1 (Important) - Backlog
- [ ] Add Service Worker untuk offline support
- [ ] Add error boundaries per section
- [ ] Performance monitoring (Web Vitals)
- [ ] React Query DevTools (development)

### P2 (Nice to Have) - Future
- [ ] PWA manifest
- [ ] Push notifications
- [ ] Image optimization
- [ ] Virtual scrolling untuk large lists

## Files Modified/Created

### New Files (React Query)
- `/frontend/src/lib/queryClient.js` - Query client + keys factory
- `/frontend/src/hooks/useApi.js` - Custom React Query hooks

### Modified Files
- `/frontend/src/main.jsx` - QueryClientProvider
- `/frontend/src/context/DashboardContext.jsx` - Refactored dengan React Query
- `/frontend/src/pages/Dashboard.jsx` - Menggunakan React Query hooks

---
Last Updated: March 2026
Version: 4.0.0 (React Query)
