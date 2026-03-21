const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const satkers = await prisma.satker.findMany();
    console.log(JSON.stringify(satkers.map(s => s.nama), null, 2));
}
main().finally(() => prisma.$disconnect());
