const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const satkerCount = await prisma.satker.count();
    const personelCount = await prisma.personel.count();
    const pelanggaranCount = await prisma.pelanggaran.count();
    console.log(`Verifikasi Data:`);
    console.log(`- Satker: ${satkerCount}`);
    console.log(`- Personel: ${personelCount}`);
    console.log(`- Pelanggaran: ${pelanggaranCount}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
