const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const satkerName = '14';

    const satker = await prisma.satker.findUnique({
        where: { nama: satkerName }
    });

    if (!satker) {
        console.log(`Satker with name '${satkerName}' not found.`);
        return;
    }

    console.log(`Found Satker '${satkerName}' with ID: ${satker.id}`);

    // Get all personnel in this satker
    const personelList = await prisma.personel.findMany({
        where: { satkerId: satker.id }
    });

    const personelIds = personelList.map(p => p.id);
    console.log(`Found ${personelIds.length} personnel in this Satker.`);

    if (personelIds.length > 0) {
        // Delete related AuditLogs (if any refer to these targets, though audit targetId is string/id)
        // For safety, let's delete violations first
        const delPelanggaran = await prisma.pelanggaran.deleteMany({
            where: { personelId: { in: personelIds } }
        });
        console.log(`Deleted ${delPelanggaran.count} Pelanggaran records.`);

        const delPersonel = await prisma.personel.deleteMany({
            where: { satkerId: satker.id }
        });
        console.log(`Deleted ${delPersonel.count} Personel records.`);
    }

    // Finally delete the satker
    await prisma.satker.delete({
        where: { id: satker.id }
    });

    console.log(`Successfully deleted Satker '${satkerName}'.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
