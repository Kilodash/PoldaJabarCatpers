const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- RESET DATA START ---');
    try {
        console.log('Deleting AuditLogs...');
        await prisma.auditLog.deleteMany({});
        console.log('Deleting Pelanggaran...');
        await prisma.pelanggaran.deleteMany({});
        console.log('Deleting Personel...');
        await prisma.personel.deleteMany({});
        console.log('Database tables cleared successfully.');
        
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log('Cleaning uploads folder...');
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== '.gitkeep' && file !== 'index.html' && file !== 'Personel_Bermasalah_PoldaJabar_10_Maret_2026.xls') {
                    const filePath = path.join(uploadsDir, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted file: ${file}`);
                    }
                }
            }
            console.log('Uploads folder cleaned.');
        }

        console.log('Cleaning up auto-created Satkers...');
        const recentTime = new Date(Date.now() - 120 * 60 * 1000); // 2 hours
        const recentSatkers = await prisma.satker.findMany({
            where: { createdAt: { gte: recentTime } }
        });
        let deletedSatCount = 0;
        for (const satker of recentSatkers) {
            const userCount = await prisma.user.count({ where: { satkerId: satker.id } });
            if (userCount === 0) {
                await prisma.satker.delete({ where: { id: satker.id } });
                deletedSatCount++;
            }
        }
        console.log(`Deleted ${deletedSatCount} satkers.`);

    } catch (error) {
        console.error('Error during reset:', error);
    } finally {
        await prisma.$disconnect();
    }
    console.log('--- RESET DATA FINISHED ---');
}
main();
