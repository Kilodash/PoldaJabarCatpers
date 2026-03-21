const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const toTitleCase = (str) =>
    str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const satkerNames = [
    'ITWASDA',
    'BIDPROPAM',
    'BIDHUMAS',
    'BIDKUM',
    'BID TIK',
    'ROOPS',
    'RORENA',
    'RO SDM',
    'RO LOG',
    'SPRIPIM',
    'SETUM',
    'YANMA',
    'DITINTELKAM',
    'DITRESKRIMUM',
    'DITRESKRIMSUS',
    'DITRESNARKOBA',
    'DITBINMAS',
    'DITSAMAPTA',
    'DITLANTAS',
    'DITPAMOBVIT',
    'DITPOLAIRUD',
    'SATBRIMOB',
    'SPKT',
    'DITTAHTI',
    'SPN',
    'BIDKEU',
    'BIDDOKKES',
    'POLDA JABAR'   // Polda Jabar sendiri di urutan terakhir
].map(n => `${toTitleCase(n)} Polda Jabar`);

// Override Polda Jabar sebagai nama standalone (bukan "Polda Jabar Polda Jabar")
satkerNames[satkerNames.length - 1] = 'Polda Jabar';

async function main() {
    console.log('Starting Satker seed...');

    // Hapus semua satker yang belum memiliki personel
    const existing = await prisma.satker.findMany();
    for (const s of existing) {
        const count = await prisma.personel.count({ where: { satkerId: s.id } });
        if (count === 0) {
            await prisma.satker.delete({ where: { id: s.id } });
            console.log(`  Deleted (empty): ${s.nama}`);
        } else {
            console.log(`  Skipped (has ${count} personel): ${s.nama}`);
        }
    }

    // Buat satker baru
    for (const nama of satkerNames) {
        const exists = await prisma.satker.findUnique({ where: { nama } });
        if (!exists) {
            await prisma.satker.create({ data: { nama } });
            console.log(`  Created: ${nama}`);
        } else {
            console.log(`  Already exists: ${nama}`);
        }
    }

    console.log('\nDone! Total Satker:');
    const all = await prisma.satker.findMany({ orderBy: { id: 'asc' } });
    all.forEach((s, i) => console.log(`  ${i + 1}. ${s.nama}`));
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
