const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const satkerList = [
    "Polda Jabar",
    "Polrestabes Bandung",
    "Polresta Bandung",
    "Polres Cimahi",
    "Polres Sumedang",
    "Polres Garut",
    "Polres Tasikmalaya Kota",
    "Polres Tasikmalaya",
    "Polres Ciamis",
    "Polres Banjar",
    "Polres Pangandaran",
    "Polresta Cirebon",
    "Polres Cirebon Kota",
    "Polres Indramayu",
    "Polres Kuningan",
    "Polres Majalengka",
    "Polresta Bogor Kota",
    "Polres Bogor",
    "Polres Sukabumi Kota",
    "Polres Sukabumi",
    "Polres Cianjur",
    "Polres Purwakarta",
    "Polres Karawang",
    "Polres Subang"
];

async function resetDB() {
    console.log("Memulai proses RESET DATABASE...");

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Hapus Audit Log
            console.log("Menghapus histori Audit Log...");
            await tx.auditLog.deleteMany({});

            // 2. Hapus Pelanggaran
            console.log("Menghapus data Pelanggaran...");
            await tx.pelanggaran.deleteMany({});

            // 3. Hapus Personel
            console.log("Menghapus data Personel...");
            await tx.personel.deleteMany({});

            // 4. Melepaskan Satker dari akun User untuk menghindari Foreign Key Constraint
            console.log("Melepaskan relasi user dari Satker lama...");
            await tx.user.updateMany({
                data: { satkerId: null }
            });

            // 5. Menghapus semua Satker
            console.log("Menghapus data Satuan Kerja (Satker) lama...");
            await tx.satker.deleteMany({});

            // 6. Menyemai (Seed) Satker Baru
            console.log("Menyemai data Satker baru sesuai list...");
            const createdSatkers = [];
            for (const nama of satkerList) {
                const s = await tx.satker.create({
                    data: { nama }
                });
                createdSatkers.push(s);
            }

            // Opsional: Hubungkan kembali Admin Polda ke "Polda Jabar"
            const poldaSatker = createdSatkers.find(s => s.nama === "Polda Jabar");
            if (poldaSatker) {
                await tx.user.updateMany({
                    where: { role: 'ADMIN_POLDA' },
                    data: { satkerId: poldaSatker.id }
                });
                console.log("Admin berhasil di-relink ke Satker 'Polda Jabar'.");
            }

            console.log(`Berhasil membuat ${createdSatkers.length} Satuan Kerja.`);
        });

        console.log("✅ RESET DATABASE SELESAI!");
    } catch (err) {
        console.error("❌ Gagal mereset database:");
        console.error(err);
    }
}

resetDB().catch(console.error).finally(() => prisma.$disconnect());
