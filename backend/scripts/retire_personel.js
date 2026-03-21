const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();

    // Find all personnel who have reached or passed their retirement date
    // and are still marked as 'AKTIF' or have null deletedAt
    const retiredPersonel = await prisma.personel.findMany({
        where: {
            tanggalPensiun: {
                lte: today
            },
            statusKeaktifan: 'AKTIF',
            deletedAt: null // We only care about those not already soft-deleted
        }
    });

    console.log(`Found ${retiredPersonel.length} personnel who have reached retirement age.`);

    if (retiredPersonel.length > 0) {
        let count = 0;

        for (const p of retiredPersonel) {
            // Soft delete them marking as PENSIUN
            const deletedNrp = `DEL_${Date.now()}_${p.nrpNip}`;

            await prisma.personel.update({
                where: { id: p.id },
                data: {
                    deletedAt: new Date(),
                    nrpNip: deletedNrp, // Free up the NRP for new registrants if needed
                    statusKeaktifan: 'PENSIUN'
                }
            });
            count++;

            // To ensure unique DEL prefix timestamps if running fast
            await new Promise(resolve => setTimeout(resolve, 2));
        }

        console.log(`Successfully updated ${count} personnel to PENSIUN status (Tidak Aktif).`);
    } else {
        console.log("No active personnel found past their retirement date.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
