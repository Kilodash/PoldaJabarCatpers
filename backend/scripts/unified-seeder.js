const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const internalSatkers = [
    'ITWASDA', 'BIDPROPAM', 'BIDHUMAS', 'BIDKUM', 'BID TIK',
    'ROOPS', 'RORENA', 'RO SDM', 'RO LOG', 'SPRIPIM',
    'SETUM', 'YANMA', 'DITINTELKAM', 'DITRESKRIMUM', 'DITRESKRIMSUS',
    'DITRESNARKOBA', 'DITBINMAS', 'DITSAMAPTA', 'DITLANTAS', 'DITPAMOBVIT',
    'DITPOLAIRUD', 'SATBRIMOB', 'SPKT', 'DITTAHTI', 'SPN',
    'BIDKEU', 'BIDDOKKES'
].map(n => n === 'Polda Jabar' ? n : (n.startsWith('BID') || n.startsWith('DIT') || n.startsWith('RO') || n.startsWith('SAT') ? `${n} Polda Jabar` : n));

const regionalSatkers = [
    "Polrestabes Bandung", "Polresta Bandung", "Polres Cimahi", "Polres Sumedang",
    "Polres Garut", "Polres Tasikmalaya Kota", "Polres Tasikmalaya", "Polres Ciamis",
    "Polres Banjar", "Polres Pangandaran", "Polresta Bogor Kota", "Polres Bogor",
    "Polres Sukabumi Kota", "Polres Sukabumi", "Polres Cianjur", "Polresta Cirebon",
    "Polres Cirebon Kota", "Polres Majalengka", "Polres Kuningan", "Polres Indramayu",
    "Polres Purwakarta", "Polres Karawang", "Polres Subang"
];

const allSatkers = ["Polda Jabar", ...internalSatkers, ...regionalSatkers];

const defaultSettings = [
    { key: 'USIA_PENSIUN_POLRI', value: '58', deskripsi: 'Usia maksimum pensiun Anggota Polri' },
    { key: 'USIA_PENSIUN_PNS', value: '58', deskripsi: 'Usia maksimum pensiun Pegawai Negeri Sipil' },
    { key: 'PANJANG_NRP_POLRI', value: '8', deskripsi: 'Panjang digit wajib format NRP Anggota POLRI' },
    { key: 'PANJANG_NIP_PNS', value: '18', deskripsi: 'Panjang digit wajib format NIP Pegawai Negeri Sipil' },
    { key: 'USIA_MINIMAL_POLRI', value: '18', deskripsi: 'Batas minimal usia masuk personel POLRI' },
    { key: 'USIA_MINIMAL_PNS', value: '18', deskripsi: 'Batas minimal pendaftaran CPNS/PNS' }
];

async function main() {
    console.log('🚀 Memulai Unified Seeder untuk Produksi...');

    console.log('\n--- Seeding Satker ---');
    for (const [index, nama] of allSatkers.entries()) {
        const exists = await prisma.satker.findFirst({ where: { nama } });
        if (!exists) {
            await prisma.satker.create({ data: { nama, urutan: index + 1 } });
            console.log(`✅ Created Satker: ${nama}`);
        } else {
            // Update urutan if exists
            await prisma.satker.update({ where: { id: exists.id }, data: { urutan: index + 1 } });
            console.log(`⏭️  Satker already exists, updated urutan: ${nama}`);
        }
    }

    console.log('\n--- Seeding Default Settings ---');
    for (const s of defaultSettings) {
        const exists = await prisma.pengaturan.findFirst({ where: { key: s.key } });
        if (!exists) {
            await prisma.pengaturan.create({ data: s });
            console.log(`✅ Created Setting: ${s.key}`);
        } else {
            console.log(`⏭️  Setting already exists: ${s.key}`);
        }
    }

    console.log('\n✨ Unified Seeder Selesai!');
}

main()
    .catch((e) => {
        console.error('❌ Seeder Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
