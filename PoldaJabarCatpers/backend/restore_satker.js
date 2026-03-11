const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- RESTORING SATKER ---');
    // Find satkers created today (since the import script ran just a few minutes ago)
    const recentTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    
    const recentSatkers = await prisma.satker.findMany({
        where: {
            createdAt: { gte: recentTime }
        }
    });

    console.log(`Found ${recentSatkers.length} satkers created in the last hour.`);

    let deletedCount = 0;
    for (const satker of recentSatkers) {
        // Check if there are any users connected
        const userCount = await prisma.user.count({ where: { satkerId: satker.id } });
        if (userCount === 0) {
            await prisma.satker.delete({ where: { id: satker.id } });
            deletedCount++;
        }
    }

    console.log(`Deleted ${deletedCount} satkers.`);
    console.log('--- RESTORE FINISHED ---');
}
main().finally(() => prisma.$disconnect());
