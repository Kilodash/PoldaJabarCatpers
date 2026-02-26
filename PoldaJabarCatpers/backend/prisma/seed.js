const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Memulai seeder dasar Polda Jabar...');

    // 1. Buat Satker Default (Polda Induk & Contoh Satker Level Bawah)
    const satkerPolda = await prisma.satker.upsert({
        where: { nama: 'Polda Jawa Barat (Induk)' },
        update: {},
        create: { nama: 'Polda Jawa Barat (Induk)' }
    });

    const satkerBrimob = await prisma.satker.upsert({
        where: { nama: 'Sat Brimob Polda Jabar' },
        update: {},
        create: { nama: 'Sat Brimob Polda Jabar' }
    });

    console.log('Satker berhasil dibuat.');

    // 2. Buat User Super Admin
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
    const adminPolda = await prisma.user.upsert({
        where: { email: 'admin@poldajabar.go.id' },
        update: {},
        create: {
            email: 'admin@poldajabar.go.id',
            password: hashedPasswordAdmin,
            role: 'ADMIN_POLDA',
            satkerId: satkerPolda.id
        }
    });

    // 3. Buat User Operator Satker
    const hashedPasswordOp = await bcrypt.hash('operator123', 10);
    const operatorBrimob = await prisma.user.upsert({
        where: { email: 'operator.brimob@poldajabar.go.id' },
        update: {},
        create: {
            email: 'operator.brimob@poldajabar.go.id',
            password: hashedPasswordOp,
            role: 'OPERATOR_SATKER',
            satkerId: satkerBrimob.id
        }
    });

    // 4. Pengaturan Sistem Default
    await prisma.pengaturan.upsert({
        where: { key: 'USIA_PENSIUN_POLRI' },
        update: {},
        create: { key: 'USIA_PENSIUN_POLRI', value: '58', deskripsi: 'Usia maksimum pensiun Anggota Polri' }
    });

    await prisma.pengaturan.upsert({
        where: { key: 'USIA_PENSIUN_PNS' },
        update: {},
        create: { key: 'USIA_PENSIUN_PNS', value: '58', deskripsi: 'Usia maksimum pensiun Pegawai Negeri Sipil' }
    });

    await prisma.pengaturan.upsert({
        where: { key: 'PANJANG_NRP_POLRI' },
        update: {},
        create: { key: 'PANJANG_NRP_POLRI', value: '8', deskripsi: 'Panjang digit wajib format NRP Anggota POLRI' }
    });

    await prisma.pengaturan.upsert({
        where: { key: 'PANJANG_NIP_PNS' },
        update: {},
        create: { key: 'PANJANG_NIP_PNS', value: '18', deskripsi: 'Panjang digit wajib format NIP Pegawai Negeri Sipil' }
    });

    await prisma.pengaturan.upsert({
        where: { key: 'USIA_MINIMAL_POLRI' },
        update: {},
        create: { key: 'USIA_MINIMAL_POLRI', value: '18', deskripsi: 'Batas minimal usia masuk personel POLRI' }
    });

    await prisma.pengaturan.upsert({
        where: { key: 'USIA_MINIMAL_PNS' },
        update: {},
        create: { key: 'USIA_MINIMAL_PNS', value: '18', deskripsi: 'Batas minimal pendaftaran CPNS/PNS' }
    });

    console.log('User Admin dan Operator berhasil disiapkan.');
    console.log('Seeding selesai.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
