const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy data...');

  // Create Satker
  const satkers = [
    'Polda Jabar',
    'Polrestabes Bandung',
    'Polresta Bogor Kota',
    'Polres Cirebon',
    'Polres Garut'
  ];

  const satkerMap = {};
  for (const sName of satkers) {
    let s = await prisma.satker.findUnique({ where: { nama: sName } });
    if (!s) s = await prisma.satker.create({ data: { nama: sName } });
    satkerMap[sName] = s.id;
  }

  // Helper date
  const pastDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  const personnelData = [
    {
      nrpNip: '80010001', namaLengkap: 'Budi Santoso', pangkat: 'Bripka', jabatan: 'Bintara', satker: 'Polrestabes Bandung',
      status: 'PROSES', wujud: 'Lalai dalam tugas penjagaan', jenisDasar: 'Riksa Provos', sidang: null, hukuman: null
    },
    {
      nrpNip: '75020102', namaLengkap: 'Andi Mulyana', pangkat: 'Aipda', jabatan: 'Kanit', satker: 'Polres Garut',
      status: 'PERDAMAIAN', wujud: 'Perselisihan dengan warga', jenisDasar: 'Hasil Lidik Terbukti', sidang: null, hukuman: null, nomorSurat: 'RJ-01/I/2026/Res'
    },
    {
      nrpNip: '82040501', namaLengkap: 'Rina Kusuma', pangkat: 'Briptu', jabatan: 'Bintara', satker: 'Polda Jabar',
      status: 'TIDAK_TERBUKTI_RIKSA', wujud: 'Dugaan pungli', jenisDasar: 'Riksa/Audit Wabprof', sidang: null, hukuman: null, nomorSp3: 'SP3/05/2026', nomorSktt: 'SKTT/11/2026'
    },
    {
      nrpNip: '79090123', namaLengkap: 'Dimas Aditya', pangkat: 'Iptu', jabatan: 'Kaur', satker: 'Polresta Bogor Kota',
      status: 'MENJALANI_HUKUMAN', wujud: 'Pelanggaran disiplin berat', jenisDasar: 'Hasil Lidik Terbukti', sidang: 'DISIPLIN', hukuman: '["Mutasi yang bersifat demosi", "Penundaan kenaikan pangkat untuk paling lama 1 (satu) tahun"]', nomorSkep: 'SKEP/99/II/2026'
    },
    {
      nrpNip: '81030999', namaLengkap: 'Joni Iskandar', pangkat: 'Aiptu', jabatan: 'Bintara', satker: 'Polres Cirebon',
      status: 'MENJALANI_HUKUMAN', wujud: 'Keterlibatan narkoba', jenisDasar: 'LP Pidana', sidang: 'KEPP', hukuman: '["PTDH (Pemberhentian Tidak Dengan Hormat) sebagai anggota Polri"]', nomorSkep: 'SKEP-PTDH/01/2026'
    },
    {
      nrpNip: '19700101200001', namaLengkap: 'Siti Aminah', pangkat: 'Penata (III/c)', jabatan: 'PNS', satker: 'Polda Jabar', jenisPegawai: 'PNS',
      status: 'SIDANG', wujud: 'Mangkir kerja 10 hari', jenisDasar: 'Riksa Provos', sidang: 'DISIPLIN', hukuman: null, rps: true
    }
  ];

  for (const p of personnelData) {
    const isPns = p.jenisPegawai === 'PNS';
    let pensiunDate = new Date('1980-01-01');
    pensiunDate.setFullYear(pensiunDate.getFullYear() + 58);

    let createdPersonel = await prisma.personel.create({
      data: {
        jenisPegawai: isPns ? 'PNS' : 'POLRI',
        nrpNip: p.nrpNip,
        namaLengkap: p.namaLengkap,
        pangkat: p.pangkat,
        jabatan: p.jabatan,
        satkerId: satkerMap[p.satker],
        tanggalLahir: new Date('1980-01-01'),
        tanggalPensiun: pensiunDate,
        statusKeaktifan: p.hukuman && p.hukuman.includes('PTDH') ? 'TIDAK AKTIF (PTDH)' : 'AKTIF',
        isDraft: false
      }
    });

    await prisma.pelanggaran.create({
      data: {
        personelId: createdPersonel.id,
        nomorSurat: 'DASAR-' + Math.floor(Math.random() * 10000),
        tanggalSurat: pastDate(Math.floor(Math.random() * 60) + 10),
        wujudPerbuatan: p.wujud,
        jenisDasar: p.jenisDasar,
        pangkatSaatMelanggar: p.pangkat,
        jabatanSaatMelanggar: p.jabatan,
        satkerSaatMelanggar: p.satker,
        
        statusPenyelesaian: p.status,
        
        jenisSidang: p.sidang,
        hukuman: p.hukuman,
        nomorSkep: p.nomorSkep,
        tanggalSkep: p.nomorSkep ? pastDate(5) : null,
        tanggalBisaAjukanRps: p.rps || p.nomorSkep ? pastDate(-30) : null, // Future date

        nomorSuratSelesai: p.nomorSurat || null,
        tanggalSuratSelesai: p.nomorSurat ? pastDate(2) : null,

        nomorSp3: p.nomorSp3 || null,
        tanggalSp3: p.nomorSp3 ? pastDate(8) : null,
        nomorSktt: p.nomorSktt || null,
        tanggalSktt: p.nomorSktt ? pastDate(7) : null,

        isDraft: false
      }
    });
  }

  console.log('Dummy data seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
