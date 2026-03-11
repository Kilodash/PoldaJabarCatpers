const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Memulai reset dan seeder Polda Jabar...');

    // Hapus data lama agar ID reset dan urutan konsisten
    await prisma.auditLog.deleteMany();
    await prisma.pelanggaran.deleteMany();
    await prisma.personel.deleteMany();
    await prisma.user.deleteMany();
    await prisma.satker.deleteMany();
    await prisma.pengaturan.deleteMany();

    const satkerNames = [
        "Satker Polda Jabar",
        "Polrestabes Bandung",
        "Polresta Bandung",
        "Polres Cimahi",
        "Polres Sumedang",
        "Polres Garut",
        "Polres Tasikmalaya Kota",
        "Polres Tasikmalaya",
        "Polres Ciamis",
        "Polres Banjar",
        "Polres Pangandaran",
        "Polresta Bogor Kota",
        "Polres Bogor",
        "Polres Sukabumi Kota",
        "Polres Sukabumi",
        "Polres Cianjur",
        "Polresta Cirebon",
        "Polres Cirebon Kota",
        "Polres Majalengka",
        "Polres Kuningan",
        "Polres Indramayu",
        "Polres Purwakarta",
        "Polres Karawang",
        "Polres Subang"
    ];

    console.log('Membuat Satker sesuai urutan...');
    const createdSatkers = [];
    for (const sName of satkerNames) {
        const s = await prisma.satker.create({
            data: { nama: sName }
        });
        createdSatkers.push(s);
    }

    const satkerPolda = createdSatkers[0];
    const satkerBrimob = createdSatkers[0]; // Mapping ke Polda Jabar karena Brimob tidak di list baru

    // 2. Buat User Super Admin
    const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
        data: {
            email: 'admin@poldajabar.go.id',
            password: hashedPasswordAdmin,
            role: 'ADMIN_POLDA',
            satkerId: satkerPolda.id
        }
    });

    // 3. Buat User Operator Satker (Polrestabes Bandung)
    const satkerBandung = createdSatkers[1];
    const hashedPasswordOperator = await bcrypt.hash('operator123', 10);
    await prisma.user.create({
        data: {
            email: 'operator@bandung.go.id',
            password: hashedPasswordOperator,
            role: 'OPERATOR_SATKER',
            satkerId: satkerBandung.id
        }
    });

    // 4. Pengaturan Sistem Default
    const defaultSettings = [
        { key: 'USIA_PENSIUN_POLRI', value: '58', deskripsi: 'Usia maksimum pensiun Anggota Polri' },
        { key: 'USIA_PENSIUN_PNS', value: '58', deskripsi: 'Usia maksimum pensiun Pegawai Negeri Sipil' },
        { key: 'PANJANG_NRP_POLRI', value: '8', deskripsi: 'Panjang digit wajib format NRP Anggota POLRI' },
        { key: 'PANJANG_NIP_PNS', value: '18', deskripsi: 'Panjang digit wajib format NIP Pegawai Negeri Sipil' },
        { key: 'USIA_MINIMAL_POLRI', value: '18', deskripsi: 'Batas minimal usia masuk personel POLRI' },
        { key: 'USIA_MINIMAL_PNS', value: '18', deskripsi: 'Batas minimal pendaftaran CPNS/PNS' }
    ];

    for (const s of defaultSettings) {
        await prisma.pengaturan.create({ data: s });
    }

    // 5. Tambah Dummy Personel (POLRI)
    const dummyPolri = await prisma.personel.create({
        data: {
            nrpNip: '88100123',
            namaLengkap: 'Budi Santoso, S.H.',
            pangkat: 'AKBP',
            jabatan: 'Kabag Ops',
            jenisPegawai: 'POLRI',
            satkerId: satkerPolda.id,
            tanggalLahir: new Date('1988-10-15'),
            tanggalPensiun: new Date('2046-10-15'),
            statusKeaktifan: 'AKTIF'
        }
    });

    await prisma.pelanggaran.create({
        data: {
            personelId: dummyPolri.id,
            nomorSurat: 'LP/01/I/2024/Propam',
            tanggalSurat: new Date('2024-01-10'),
            wujudPerbuatan: 'Pelanggaran Disiplin (Penyalahgunaan Wewenang)',
            statusPenyelesaian: 'MENJALANI_HUKUMAN',
            jenisSidang: 'DISIPLIN',
            hukuman: 'Teguran Tertulis & Penundaan Kenaikan Pangkat 1 Periode',
            tanggalRekomendasi: new Date('2025-01-10'),
            nomorRekomendasi: 'R-RPS/22/I/2025'
        }
    });

    // 7. Tambah Dummy Personel (PNS)
    const dummyPns = await prisma.personel.create({
        data: {
            nrpNip: '199505202022031001',
            namaLengkap: 'Siti Aminah, A.Md.',
            pangkat: 'Pengatur (II/c)',
            jabatan: 'Bamin Sat Brimob',
            jenisPegawai: 'PNS',
            satkerId: satkerPolda.id,
            tanggalLahir: new Date('1995-05-20'),
            tanggalPensiun: new Date('2053-05-20'),
            statusKeaktifan: 'AKTIF'
        }
    });

    await prisma.pelanggaran.create({
        data: {
            personelId: dummyPns.id,
            nomorSurat: 'LP/05/II/2025/Propam',
            tanggalSurat: new Date('2025-02-01'),
            wujudPerbuatan: 'Mangkir dalam Tugas (Absensi)',
            statusPenyelesaian: 'PROSES'
        }
    });

    console.log('Seeding selesai dengan Satker baru.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
