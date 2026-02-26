-- CreateTable
CREATE TABLE "Satker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR_SATKER',
    "satkerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_satkerId_fkey" FOREIGN KEY ("satkerId") REFERENCES "Satker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Personel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jenisPegawai" TEXT NOT NULL,
    "nrpNip" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "pangkat" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "satkerId" INTEGER NOT NULL,
    "tanggalLahir" DATETIME NOT NULL,
    "tanggalPensiun" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Personel_satkerId_fkey" FOREIGN KEY ("satkerId") REFERENCES "Satker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pelanggaran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personelId" TEXT NOT NULL,
    "nomorSurat" TEXT NOT NULL,
    "tanggalSurat" DATETIME NOT NULL,
    "wujudPerbuatan" TEXT NOT NULL,
    "keteranganDasar" TEXT,
    "fileDasarUrl" TEXT,
    "jenisSidang" TEXT,
    "hukuman" TEXT,
    "banding" BOOLEAN,
    "statusPenyelesaian" TEXT NOT NULL,
    "nomorSuratSelesai" TEXT,
    "tanggalSuratSelesai" DATETIME,
    "fileSelesaiUrl" TEXT,
    "tanggalRekomendasi" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pelanggaran_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "Personel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Satker_nama_key" ON "Satker"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Personel_nrpNip_key" ON "Personel"("nrpNip");
