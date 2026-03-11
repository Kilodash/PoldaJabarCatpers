const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const list = await prisma.personel.findMany({ select: { nrpNip: true }, take: 10 });
    console.log(list);
}
main().catch(console.error).finally(() => prisma.$disconnect());
