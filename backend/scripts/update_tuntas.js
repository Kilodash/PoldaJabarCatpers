const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`Checking violations with recommendations...`);

    // In our system, 'SIDANG' functions as the "Tuntas/Selesai" point 
    // when they have been processed through to the recommendation stage.
    // The previous import logic set some to 'MENJALANI_HUKUMAN' if they had sidang
    // and 'SIDANG' if they had rekomendasi. But just to be sure we enforce the rule
    // for everything that currently has `tanggalRekomendasi` populated.

    const result = await prisma.pelanggaran.updateMany({
        where: {
            tanggalRekomendasi: {
                not: null
            }
        },
        data: {
            statusPenyelesaian: 'SIDANG'
        }
    });

    console.log(`Successfully updated ${result.count} violation records with recommendations to 'SIDANG' (Tuntas).`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
