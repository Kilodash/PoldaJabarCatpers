const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetData() {
    console.log('--- STARTING CLEAN RESET (Personel, Pelanggaran, AuditLog) ---');
    try {
        // Order matters due to potential foreign keys, though Prisma handles it mostly
        // deleteMany is safe.
        
        console.log('Deleting AuditLogs...');
        await prisma.auditLog.deleteMany({});
        
        console.log('Deleting Pelanggaran...');
        await prisma.pelanggaran.deleteMany({});
        
        console.log('Deleting Personel...');
        await prisma.personel.deleteMany({});

        console.log('--- RESET SUCCESSFUL ---');
        console.log('Note: Satker, User, and Pengaturan tables were preserved.');
    } catch (error) {
        console.error('Error during reset:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetData();
