const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const pelanggaran = await prisma.pelanggaran.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { personel: true }
    });
    console.log("5 Recent Pelanggaran:");
    console.log(JSON.stringify(pelanggaran, null, 2));
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
