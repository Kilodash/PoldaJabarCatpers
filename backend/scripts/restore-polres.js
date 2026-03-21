const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const polresList = [
    'Polrestabes Bandung',
    'Polresta Bandung',
    'Polres Cimahi',
    'Polres Garut',
    'Polres Tasikmalaya Kota',
    'Polres Tasikmalaya',
    'Polres Ciamis',
    'Polres Banjar',
    'Polres Pangandaran',
    'Polresta Cirebon',
    'Polres Cirebon Kota',
    'Polres Indramayu',
    'Polres Kuningan',
    'Polres Majalengka',
    'Polresta Bogor Kota',
    'Polres Bogor',
    'Polres Sukabumi Kota',
    'Polres Sukabumi',
    'Polres Cianjur',
    'Polres Purwakarta',
    'Polres Subang',
];

async function main() {
    for (const nama of polresList) {
        const exists = await prisma.satker.findUnique({ where: { nama } });
        if (!exists) {
            await prisma.satker.create({ data: { nama } });
            console.log('Created:', nama);
        } else {
            console.log('Already exists:', nama);
        }
    }
    const all = await prisma.satker.findMany({ orderBy: { id: 'asc' } });
    console.log('\nTotal satker sekarang:', all.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
