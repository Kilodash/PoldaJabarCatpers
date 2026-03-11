const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const firstNames = ['Budi', 'Andi', 'Rina', 'Dimas', 'Joni', 'Siti', 'Agus', 'Tono', 'Dewi', 'Ayu', 'Rizky', 'Hendra', 'Ahmad', 'Anton', 'Bambang', 'Cahyo', 'Dedi', 'Eko', 'Fajar', 'Gilang'];
const lastNames = ['Santoso', 'Mulyana', 'Kusuma', 'Aditya', 'Iskandar', 'Aminah', 'Pratama', 'Saputra', 'Wijaya', 'Lestari', 'Hidayat', 'Nugroho', 'Setiawan', 'Wibowo', 'Siregar'];

const pangkatPolri = ["Bripda", "Briptu", "Brigadir", "Bripka", "Aipda", "Aiptu", "Ipda", "Iptu", "AKP", "Kompol", "AKBP"];
const pangkatPns = ["Pengatur (II/c)", "Penata Muda (III/a)", "Penata (III/c)"];

const wujudList = [
  'Lalai dalam tugas penjagaan',
  'Perselisihan dengan warga',
  'Dugaan pungli',
  'Pelanggaran disiplin berat',
  'Keterlibatan narkoba',
  'Mangkir kerja 10 hari',
  'Penyalahgunaan wewenang',
  'Tidak profesional dalam penanganan kasus',
  'Menurunkan citra Polri',
  'Disersi'
];

const jenisDasarList = [
  'Hasil Lidik Terbukti',
  'Riksa Provos',
  'Riksa/Audit Wabprof',
  'LP Pidana'
];

const statusSelesaiList = [
  'PROSES',
  'PERDAMAIAN',
  'TIDAK_TERBUKTI_RIKSA',
  'TIDAK_TERBUKTI_SIDANG',
  'SIDANG',
  'MENJALANI_HUKUMAN'
];

async function main() {
  console.log('Seeding massive dummy data per satker...');

  const satkers = await prisma.satker.findMany();
  if (satkers.length === 0) {
    console.log('No Satkers found. Please add satkers first.');
    process.exit(0);
  }

  const pastDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  let count = 0;

  for (const satker of satkers) {
    // Generate 3 to 7 personnel per satker
    const numPersonnel = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numPersonnel; i++) {
       const isPns = Math.random() > 0.8;
       const pangkat = isPns ? pangkatPns[Math.floor(Math.random() * pangkatPns.length)] : pangkatPolri[Math.floor(Math.random() * pangkatPolri.length)];
       const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
       const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
       const namaLengkap = `${fName} ${lName}`;
       const nrpNip = (Math.floor(Math.random() * 90000000) + 10000000).toString();
       
       const pensiunDate = new Date('1980-01-01');
       pensiunDate.setFullYear(pensiunDate.getFullYear() + 58);

       const statusIndex = Math.floor(Math.random() * statusSelesaiList.length);
       const status = statusSelesaiList[statusIndex];
       
       const wujud = wujudList[Math.floor(Math.random() * wujudList.length)];
       const jenisDasar = jenisDasarList[Math.floor(Math.random() * jenisDasarList.length)];

       const isPtdh = status === 'MENJALANI_HUKUMAN' && Math.random() > 0.9;
       
       let pStatus = 'AKTIF';
       if (isPtdh) pStatus = 'TIDAK AKTIF (PTDH)';
       else if (Math.random() > 0.95) pStatus = 'PENSIUN';

       let createdPersonel;
       try {
           createdPersonel = await prisma.personel.create({
              data: {
                jenisPegawai: isPns ? 'PNS' : 'POLRI',
                nrpNip: nrpNip,
                namaLengkap: namaLengkap,
                pangkat: pangkat,
                jabatan: isPns ? 'PNS' : 'Bintara/Perwira',
                satkerId: satker.id,
                tanggalLahir: new Date('1980-01-01'),
                tanggalPensiun: pensiunDate,
                statusKeaktifan: pStatus,
                isDraft: false
              }
            });
       } catch (e) {
           continue; // Skip if duplicate NRP
       }

       const sidang = ['SIDANG', 'MENJALANI_HUKUMAN'].includes(status) ? (Math.random() > 0.5 ? 'DISIPLIN' : 'KEPP') : null;
       const hukuman = isPtdh ? '["PTDH (Pemberhentian Tidak Dengan Hormat) sebagai anggota Polri"]' : (sidang ? '["Teguran tertulis", "Penundaan mengikuti pendidikan paling lama 1 (satu) tahun"]' : null);

        await prisma.pelanggaran.create({
          data: {
            personelId: createdPersonel.id,
            nomorSurat: 'DASAR-' + Math.floor(Math.random() * 10000),
            tanggalSurat: pastDate(Math.floor(Math.random() * 60) + 10),
            wujudPerbuatan: wujud,
            jenisDasar: jenisDasar,
            pangkatSaatMelanggar: pangkat,
            jabatanSaatMelanggar: isPns ? 'PNS' : 'Bintara/Perwira',
            satkerSaatMelanggar: satker.nama,
            
            statusPenyelesaian: status,
            
            jenisSidang: sidang,
            hukuman: hukuman,
            nomorSkep: hukuman ? 'SKEP/' + Math.floor(Math.random() * 1000) : null,
            tanggalSkep: hukuman ? pastDate(5) : null,
            tanggalBisaAjukanRps: hukuman ? pastDate(-30) : null,

            nomorSuratSelesai: status === 'PERDAMAIAN' ? 'RJ-' + Math.floor(Math.random() * 1000) : null,
            tanggalSuratSelesai: status === 'PERDAMAIAN' ? pastDate(2) : null,

            nomorSp3: status.includes('TIDAK_TERBUKTI_RIKSA') ? 'SP3/' + Math.floor(Math.random() * 1000) : null,
            tanggalSp3: status.includes('TIDAK_TERBUKTI_RIKSA') ? pastDate(8) : null,
            nomorSktt: status.includes('TIDAK_TERBUKTI_RIKSA') ? 'SKTT/' + Math.floor(Math.random() * 1000) : null,
            tanggalSktt: status.includes('TIDAK_TERBUKTI_RIKSA') ? pastDate(7) : null,

            isDraft: false
          }
        });
        count++;
    }
  }

  console.log(`Dummy data seeded successfully. Total personnel added: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
