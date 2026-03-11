const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNrp() {
    const personel = await prisma.personel.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log("Recent NRPs inserted:");
    personel.forEach(p => {
        console.log(`${p.namaLengkap} - ${p.nrpNip} - ${p.jenisPegawai}`);
    });
}
checkNrp().catch(console.error).finally(() => prisma.$disconnect());
