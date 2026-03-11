const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const personel = await prisma.personel.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' }
    });
    console.log("5 Recently Updated Personel:");
    console.log(JSON.stringify(personel, null, 2));
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
