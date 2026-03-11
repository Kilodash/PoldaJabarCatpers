const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log(`Updating all violation records to 'PROSES'...`);

    const result = await prisma.pelanggaran.updateMany({
        data: {
            statusPenyelesaian: 'PROSES' // This is the internal representation of "Dalam Proses" for the ENUM/String mapping
        }
    });

    console.log(`Successfully updated ${result.count} violation records to 'PROSES'.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
