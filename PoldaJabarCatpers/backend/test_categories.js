const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testCategories() {
  const categories = ['', 'tidakAktif', 'catpersAktif', 'pernahTercatat', 'belumRps', 'DRAFT'];
  const currentDate = new Date();

  for (const cat of categories) {
    console.log(`\nTesting Category: "${cat}"`);
    let whereClause = { deletedAt: null, isDraft: false };

    if (cat === 'tidakAktif') {
        delete whereClause.deletedAt;
        whereClause.OR = [
            { tanggalPensiun: { lte: currentDate } },
            { statusKeaktifan: { not: 'AKTIF' } },
            { deletedAt: { not: null } }
        ];
    } else if (cat === 'catpersAktif') {
        whereClause.statusKeaktifan = 'AKTIF';
        whereClause.pelanggaran = {
            some: {
                deletedAt: null,
                isDraft: false,
                OR: [
                    { statusPenyelesaian: 'PROSES' },
                    {
                        statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                        tanggalRekomendasi: null,
                        OR: [
                            { tanggalBisaAjukanRps: null },
                            { tanggalBisaAjukanRps: { gt: new Date() } }
                        ]
                    }
                ]
            }
        };
    } else if (cat === 'DRAFT') {
        delete whereClause.isDraft;
        whereClause.OR = [
            { isDraft: true },
            { pelanggaran: { some: { isDraft: true, deletedAt: null } } }
        ];
    }

    try {
      const start = Date.now();
      const count = await prisma.personel.count({ where: whereClause });
      console.log(`Count: ${count} (${Date.now() - start}ms)`);
      
      if (count > 0) {
        const sample = await prisma.personel.findMany({ 
          where: whereClause, 
          take: 1,
          include: { satker: true }
        });
        console.log(`Sample: ${sample[0].namaLengkap} - Satker: ${sample[0].satker?.nama}`);
      }
    } catch (error) {
      console.error(`Error for category ${cat}:`, error.message);
    }
  }
  process.exit();
}

testCategories();
