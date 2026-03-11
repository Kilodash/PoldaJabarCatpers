# Polda Jabar - Catatan Personel (CATPERS)

Sistem Informasi Manajemen Catatan Personel untuk Polda Jawa Barat. Projek ini membantu dalam pengelolaan database personil, pelacakan pelanggaran/sanksi, dan penyajian statistik data melalui dashboard interaktif.

## Struktur Direktori
- `frontend/`: Aplikasi React (Vite) untuk interface pengguna.
- `backend/`: Server Node.js (Express) dengan Prisma ORM untuk manajemen database.

---

## 🚀 Panduan Persiapan (Setup)

### 1. Backend (Server)
1.  Buka terminal di folder `backend/`.
2.  Instal dependensi:
    ```bash
    npm install
    ```
3.  Siapkan berkas lingkungan:
    - Copy `.env.example` menjadi `.env`.
    - Sesuaikan variabel `DATABASE_URL` (default menggunakan SQLite).
4.  Inisialisasi database:
    ```bash
    npx prisma db push
    ```
5.  Generate Prisma Client:
    ```bash
    npx prisma generate
    ```
6.  Jalankan server:
    ```bash
    npm run dev
    ```

### 2. Frontend (Interface)
1.  Buka terminal di folder `frontend/`.
2.  Instal dependensi:
    ```bash
    npm install
    ```
3.  Siapkan berkas lingkungan:
    - Copy `.env.example` menjadi `.env`.
4.  Jalankan aplikasi:
    ```bash
    npm run dev
    ```

---

## 🛠 Fitur Utama
- **Dashboard Interaktif**: Statistik personil aktif, pelanggaran, dan penyelesaian sanksi.
- **Manajemen Personel**: Input data NRP/NIP dengan validasi otomatis sesuai aturan POLRI/PNS.
- **Catatan Pelanggaran**: Pelacakan riwayat sidang, hukuman, dan unggah dokumen pendukung (PDF/PNG).
- **Audit Log**: Pencatatan setiap aksi penghapusan data personil untuk keamanan.
- **Role-Based Access**: Level Admin Polda (Akses Penuh) dan Operator Satker (Terbatas pada unit sendiri).

---

## 👮 Tim Pengembang
Dibuat untuk mendukung transparansi dan efisiensi data personel di lingkungan Kepolisian Daerah Jawa Barat.
