# PRD - PoldaJabarCatpers (Catatan Personel Polda Jabar)

## Problem Statement
Perbaiki fitur pencarian menggunakan key NRP/NIP dan file PDF pada menu pencarian.
Repository: https://github.com/Kilodash/PoldaJabarCatpers

## Tech Stack
- Frontend: React + Vite, Axios, Lucide React, Sonner (toast), date-fns
- Backend: Node.js + Express, Prisma ORM, PostgreSQL (Supabase), pdf-parse, multer
- Database: PostgreSQL via Supabase (cloud)
- Deployment: Vercel

## Architecture
```
/PoldaJabarCatpers
  /backend        # Express + Prisma (PostgreSQL)
    /src/controllers/pencarian.controller.js  # Logic pencarian manual & PDF
    /src/routes/pencarian.routes.js           # Route /pencarian/manual & /pencarian/document
  /frontend        # React + Vite
    /src/pages/Pencarian.jsx                  # UI menu pencarian
    /src/utils/api.js                         # Axios instance
```

## Bug Fixes Implemented (2026-02-XX)

### Bug 1 — totalPages tidak terdefinisi [KRITIS]
- File: `frontend/src/pages/Pencarian.jsx`
- Issue: `totalPages` digunakan di JSX (baris 344) tapi tidak pernah dideklarasikan → pagination tidak pernah muncul
- Fix: Tambah `const totalPages = Math.ceil(sortedResults.length / itemsPerPage);`

### Bug 2 — Tidak ada feedback error pada pencarian manual
- File: `frontend/src/pages/Pencarian.jsx`
- Issue: `catch (error)` di `handleManualSearch` hanya `console.error` tanpa toast
- Fix: Tambah `toast.error(...)` agar user tahu jika pencarian gagal

### Bug 3 — Timeout terlalu pendek untuk PDF
- File: `frontend/src/pages/Pencarian.jsx`
- Issue: Global timeout api.js = 10 detik, tidak cukup untuk PDF besar
- Fix: Override timeout 60 detik khusus pada request `/pencarian/document`

### Bug 4 — Regex parseManualInput terlalu luas
- File: `backend/src/controllers/pencarian.controller.js`
- Issue: Regex `/\d{8,18}/` cocok 8-18 digit → false positive untuk angka 9-17 digit
- Fix: Ganti ke `/(?<![0-9])([0-9]{18}|[0-9]{8})(?![0-9])/` (hanya 8 digit NRP atau 18 digit NIP persis)

### Bug 5 — pdf-parse import menjalankan test saat init
- File: `backend/src/controllers/pencarian.controller.js`
- Issue: `require('pdf-parse')` menjalankan test file → error di beberapa environment
- Fix: Ganti ke `require('pdf-parse/lib/pdf-parse')` langsung ke lib

## Core Requirements
- Pencarian manual: input list NRP/NIP (satu per baris), tampilkan status catatan personel
- Pencarian PDF: upload dokumen PDF, ekstrak NRP/NIP otomatis, tampilkan hasil
- Hasil pencarian: nama, satker, status identitas (Sesuai/Tidak Sesuai/Tidak Ditemukan), status catatan (Bersih/Pernah Tercatat/Ada Catatan Aktif)
- Pagination hasil pencarian
- Filter tampil semua / hanya yang ditemukan

## Backlog / Next Tasks
- P1: Tambah loading skeleton saat PDF diproses (UX lebih baik)
- P1: Validasi format NRP/NIP di frontend sebelum kirim ke backend
- P2: Export hasil pencarian ke Excel/PDF
- P2: Simpan riwayat pencarian per user
