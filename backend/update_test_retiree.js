const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const p = await prisma.personel.findFirst({
            where: { statusKeaktifan: 'AKTIF' }
        });
        if (p) {
            await prisma.personel.update({
                where: { id: p.id },
                data: { tanggalPensiun: new Date('2020-01-01') }
            });
            console.log('Updated test record NRP:', p.nrpNip);
        } else {
            console.log('No active personnel found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
