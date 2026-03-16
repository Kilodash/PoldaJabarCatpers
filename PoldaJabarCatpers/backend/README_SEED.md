# Cara Memperbaiki Error "Profile Not Found" di Vercel

Error ini terjadi karena akun email Anda sudah terdaftar di Supabase, tetapi **belum ada datanya di database lokal (backend)** di lingkungan Vercel.

Ikuti langkah berikut untuk menambahkan profil Admin ke database produksi:

### 1. Siapkan Koneksi Database Produksi
Pastikan Anda memiliki `DATABASE_URL` untuk database produksi Anda (misalnya database PostgreSQL di Vercel atau Supabase).

### 2. Jalankan Script Seeder
Buka terminal di folder `backend` Proyek Anda, lalu jalankan perintah berikut:

```bash
# Ganti [DATABASE_URL] dengan koneksi string produksi Anda
# Ganti [EMAIL] dengan email yang Anda gunakan login di Supabase

SET DATABASE_URL=[DATABASE_URL]
node scripts/seed-admin-prod.js [EMAIL] [PASSWORD]
```

*Contoh (Windows PowerShell):*
```powershell
$env:DATABASE_URL="postgres://user:pass@host:port/db"
node scripts/seed-admin-prod.js admin@poldajabar.go.id admin123
```

### 3. Verifikasi
Setelah script berhasil dijalankan:
1. Kembali ke aplikasi di Vercel.
2. Refresh halaman.
3. Login kembali. Sekarang sistem akan menemukan profil Anda dan mengizinkan akses.

---
> [!IMPORTANT]
> Script `scripts/seed-admin-prod.js` menggunakan metode `upsert`, yang berarti AMAN dijalankan berkali-kali tanpa menghapus data yang sudah ada.
