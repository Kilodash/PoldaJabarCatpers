const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        const pelanggaran = await prisma.pelanggaran.findMany({
            take: 3,
            include: { personel: true },
            orderBy: { createdAt: 'asc' }
        });
        
        console.dir(pelanggaran, { depth: null });
        
        const ptdd = await prisma.personel.count({ where: { statusKeaktifan: 'TIDAK AKTIF (PTDH)' } });
        console.log(`\nTotal Personel PTDH: ${ptdd}`);

        const pnsCount = await prisma.personel.count({ where: { jenisPegawai: 'PNS' } });
        console.log(`Total Personel PNS: ${pnsCount}`);

    } finally {
        await prisma.$disconnect();
    }
}

verify();
